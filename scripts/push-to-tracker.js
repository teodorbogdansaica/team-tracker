// One-shot / re-runnable sync: pushes bob-data.json into team-tracker via its HTTP API.
// Usage: node scripts/push-to-tracker.js [--replace-members]
//   --replace-members   delete all existing members first (use for the initial seed only)
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const TYPE_MAP = {
  'S': 'sick',
  'V': 'vacation',
  'VR': 'vacation',
  'PD': 'time_off',
  'Other Leave': 'time_off',
  'Romania special sick leave': 'sick',
};

const COUNTRY_TZ = {
  'Italy': 'Europe/Rome',
  'Czech Republic': 'Europe/Prague',
  'Romania': 'Europe/Bucharest',
  'Israel': 'Asia/Jerusalem',
  'Poland': 'Europe/Warsaw',
};

const COLORS = ['#4F86C6', '#E07B54', '#6BBF6A', '#B57BCC', '#E8B84B', '#5BBCB8', '#E56B6F', '#78A5D9', '#A67CC9', '#C68E5B', '#5FA8A0'];

function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function eachDate(start, end) {
  const dates = [];
  let d = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (d <= last) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

async function main() {
  const env = loadEnv();
  const base = env.TEAM_TRACKER_URL;
  const replaceMembers = process.argv.includes('--replace-members');
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'bob-data.json'), 'utf8'));

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: env.TEAM_TRACKER_ADMIN_USER, password: env.TEAM_TRACKER_ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];
  const authed = (url, opts = {}) => fetch(`${base}${url}`, {
    ...opts,
    headers: { ...(opts.headers || {}), 'Content-Type': 'application/json', Cookie: cookie },
  });

  if (replaceMembers) {
    const existing = await (await authed('/api/members')).json();
    for (const m of existing) {
      await authed(`/api/members/${m.id}`, { method: 'DELETE' });
    }
    console.log(`Removed ${existing.length} existing members.`);
  }

  const currentMembers = await (await authed('/api/members')).json();
  const codeToId = {};
  for (const emp of data.employees) {
    let member = currentMembers.find(m => m.name === emp.name);
    if (!member) {
      member = await (await authed('/api/members', {
        method: 'POST',
        body: JSON.stringify({
          name: emp.name,
          role: 'Customer Success Engineer',
          timezone: COUNTRY_TZ[emp.country] || 'Asia/Jerusalem',
          avatar: initials(emp.name),
          color: COLORS[data.employees.indexOf(emp) % COLORS.length],
        }),
      })).json();
      console.log(`Created member ${emp.name} -> id ${member.id}`);
    }
    codeToId[emp.code] = member.id;
  }

  let entryCount = 0;
  for (const req of data.requests) {
    const memberId = codeToId[req.code];
    const type = TYPE_MAP[req.type] || 'time_off';
    for (const date of eachDate(req.start, req.end)) {
      await authed('/api/entries', { method: 'PUT', body: JSON.stringify({ member_id: memberId, date, type }) });
      entryCount++;
    }
  }

  for (const hol of data.holidays) {
    for (const code of hol.codes) {
      const memberId = codeToId[code];
      if (!memberId) continue;
      await authed('/api/entries', { method: 'PUT', body: JSON.stringify({ member_id: memberId, date: hol.date, type: 'holiday' }) });
      entryCount++;
    }
  }

  console.log(`Synced ${data.employees.length} members and ${entryCount} entries.`);
}

main().catch(err => { console.error(err); process.exit(1); });
