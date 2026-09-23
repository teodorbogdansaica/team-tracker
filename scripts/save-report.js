// Pushes a report JSON file into team-tracker's Team Reports section.
// Usage: node scripts/save-report.js <path-to-report.json>
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
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/save-report.js <path-to-report.json>');
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));

  const env = loadEnv();
  const base = env.TEAM_TRACKER_URL;
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: env.TEAM_TRACKER_ADMIN_USER, password: env.TEAM_TRACKER_ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];

  const res = await fetch(`${base}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(report),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Save failed: ${res.status} ${JSON.stringify(body)}`);
  console.log(`Saved report "${report.label}" as id ${body.id}`);
}

main().catch(err => { console.error(err); process.exit(1); });
