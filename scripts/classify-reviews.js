// Classifies scripts/intercom-reviews-raw.json into amazing/terrible customer reviews,
// excluding remarks that aren't actually a review of the TSE (follow-up questions,
// factual status updates, contentless replies like "Hi"/"ok").
const fs = require('fs');
const path = require('path');

const APP_ID = 'xf85kx3u';

const TERRIBLE_IDS = new Set([
  '215475839470899', // Marian - escalated, had to chase reply after 5 days
  '215475565364940', // Teodor - issue not solved, root cause not found
  '215475439963258', // Pedro - had to correct the AI twice
  '215475334112920', // Teodor - never heard from sales
]);

const EXCLUDE_IDS = new Set([
  '215474978506938', // Giuseppe - factual status update, not a review
  '215475768214126', // Pedro - ambiguous, critiques an unnamed prior agent
  '215475439248965', // Stefan - customer continuing troubleshooting, not a review
  '215475365979020', // Pedro - "i need the conversation to continue" (request)
  '215475256847998', // Marian - "Hi" (no content)
  '215475227693909', // Stas - "ok" (no sentiment)
  '215474915481123', // Giuseppe - follow-up technical question
  '215474947484245', // Stefan - follow-up technical question
]);

function main() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'intercom-reviews-raw.json'), 'utf8'));
  const amazing = [];
  const terrible = [];

  for (const c of raw) {
    if (EXCLUDE_IDS.has(c.id)) continue;
    const entry = {
      employee: c.assignee,
      customer: c.customer,
      rating: c.rating,
      remark: c.remark,
      date: new Date(c.created_at * 1000).toISOString().slice(0, 10),
      link: `https://app.intercom.com/a/inbox/${APP_ID}/inbox/conversation/${c.id}`,
    };
    if (TERRIBLE_IDS.has(c.id)) terrible.push(entry);
    else amazing.push(entry);
  }

  amazing.sort((a, b) => a.employee.localeCompare(b.employee));
  terrible.sort((a, b) => a.employee.localeCompare(b.employee));

  fs.writeFileSync(path.join(__dirname, 'reviews-classified.json'), JSON.stringify({ amazing, terrible }, null, 2));
  console.log(`Amazing: ${amazing.length}, Terrible: ${terrible.length} (excluded: ${EXCLUDE_IDS.size})`);
}

main();
