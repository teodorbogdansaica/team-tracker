// Pulls all rated+commented Intercom conversations for the CS team in a date range.
// Usage: node scripts/fetch-intercom-reviews.js
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

const TEAM = {
  '6461722': 'Giuseppe Margiotta',
  '7077417': 'Ivan Bozhko',
  '7105280': 'Pedro Rocha',
  '7524975': 'Stas Revva',
  '7804545': 'Marian Dumitrascu',
  '7988522': 'Shahaf Kounio',
  '7988524': 'Corrado Pettene',
  '8003514': 'Vlad Brindusescu',
  '8057317': 'Teodor Zotescu',
  '8422959': 'Stefan Enache',
  '8474921': 'Michael Dahis',
};

async function main() {
  const env = loadEnv();
  const token = env.INTERCOM_ACCESS_TOKEN;
  const from = Math.floor(Date.UTC(2026, 6, 1, 0, 0, 0) / 1000);
  const to = Math.floor(Date.UTC(2026, 8, 24, 0, 0, 0) / 1000);
  const ids = Object.keys(TEAM);

  let startingAfter = null;
  let page = 0;
  const rated = [];
  let totalSeen = 0;

  while (true) {
    page++;
    const body = {
      query: { operator: 'AND', value: [
        { field: 'admin_assignee_id', operator: 'IN', value: ids },
        { field: 'created_at', operator: '>', value: from },
        { field: 'created_at', operator: '<', value: to },
      ]},
      pagination: { per_page: 150, ...(startingAfter ? { starting_after: startingAfter } : {}) },
    };
    const res = await fetch('https://api.intercom.io/conversations/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { console.error(data); process.exit(1); }

    for (const c of data.conversations) {
      totalSeen++;
      const r = c.conversation_rating;
      if (r && r.remark && r.remark.trim().length > 0) {
        rated.push({
          id: c.id,
          assignee: TEAM[String(c.admin_assignee_id)] || `unknown(${c.admin_assignee_id})`,
          rating: r.rating,
          remark: r.remark.trim(),
          customer: (r.customer && r.customer.name) || (c.source && c.source.author && c.source.author.name) || null,
          created_at: c.created_at,
        });
      }
    }
    console.log(`page ${page}: seen ${data.conversations.length} (total so far ${totalSeen}/${data.total_count}), rated+commented so far: ${rated.length}`);

    if (!data.pages || !data.pages.next) break;
    startingAfter = data.pages.next.starting_after;
  }

  fs.writeFileSync(path.join(__dirname, 'intercom-reviews-raw.json'), JSON.stringify(rated, null, 2));
  console.log(`\nDone. ${rated.length} rated+commented conversations saved to scripts/intercom-reviews-raw.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
