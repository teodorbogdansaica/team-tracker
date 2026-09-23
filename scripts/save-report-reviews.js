// Merges scripts/reviews-classified.json into an existing report's data.
// Usage: node scripts/save-report-reviews.js <report-id>
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
  const reportId = process.argv[2];
  if (!reportId) throw new Error('Usage: node scripts/save-report-reviews.js <report-id>');
  const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, 'reviews-classified.json'), 'utf8'));

  const env = loadEnv();
  const base = env.TEAM_TRACKER_URL;
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: env.TEAM_TRACKER_ADMIN_USER, password: env.TEAM_TRACKER_ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];

  const res = await fetch(`${base}/api/reports/${reportId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ data: { reviews } }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Update failed: ${res.status} ${JSON.stringify(body)}`);
  console.log(`Updated report ${reportId} with ${reviews.amazing.length} amazing / ${reviews.terrible.length} terrible reviews.`);
}

main().catch(err => { console.error(err); process.exit(1); });
