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

async function main() {
  const env = loadEnv();
  const base = env.TEAM_TRACKER_URL;
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: env.TEAM_TRACKER_ADMIN_USER, password: env.TEAM_TRACKER_ADMIN_PASSWORD }),
  });
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];
  const authed = (url) => fetch(`${base}${url}`, { headers: { Cookie: cookie } });

  const members = await (await authed('/api/members')).json();
  console.log('Members:', members.map(m => `${m.name} (${m.timezone})`).join(', '));

  const entries = await (await authed('/api/entries?year=2026&month=8')).json();
  console.log(`August 2026 entries: ${entries.length}`);
  const byType = {};
  for (const e of entries) byType[e.type] = (byType[e.type] || 0) + 1;
  console.log('By type:', byType);
}

main().catch(err => { console.error(err); process.exit(1); });
