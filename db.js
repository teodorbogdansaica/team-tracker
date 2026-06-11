const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs   = require('fs');

const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Remove stale lock directory left by a crashed process. Safe on Railway
// because only one replica ever runs against this volume.
const dbPath  = path.join(dataDir, 'tracker.db');
const lockDir = dbPath + '.lock';
if (fs.existsSync(lockDir)) fs.rmSync(lockDir, { recursive: true, force: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    role      TEXT NOT NULL,
    timezone  TEXT NOT NULL,
    avatar    TEXT NOT NULL,
    color     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entries (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    date      TEXT NOT NULL,
    type      TEXT NOT NULL,
    UNIQUE(member_id, date),
    FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS hours (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    date      TEXT NOT NULL,
    start     TEXT NOT NULL,
    end       TEXT NOT NULL,
    UNIQUE(member_id, date),
    FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
  );
`);

// Seed demo members if empty
const count = db.prepare('SELECT COUNT(*) as c FROM members').get();
if (count.c === 0) {
  const insertMember = db.prepare(
    'INSERT INTO members (name, role, timezone, avatar, color) VALUES (?, ?, ?, ?, ?)'
  );
  const demoMembers = [
    ['Alice Johnson',        'Engineering', 'America/New_York',  'AJ', '#4F86C6'],
    ['Bob Martinez',         'Engineering', 'Europe/London',     'BM', '#E07B54'],
    ['Chen Wei',             'Design',      'Asia/Shanghai',     'CW', '#6BBF6A'],
    ['Diana Kowalski',       'Product',     'Europe/Warsaw',     'DK', '#B57BCC'],
    ['Emre Yilmaz',          'Engineering', 'Europe/Istanbul',   'EY', '#E8B84B'],
    ['Fatima Al-Said',       'Support',     'Asia/Dubai',        'FA', '#5BBCB8'],
    ['George Papadopoulos',  'Sales',       'Europe/Athens',     'GP', '#E56B6F'],
    ['Hana Tanaka',          'Engineering', 'Asia/Tokyo',        'HT', '#78A5D9'],
  ];
  const today = new Date().toISOString().slice(0, 10);
  const ids = demoMembers.map(m => {
    insertMember.run(...m);
    return db.prepare('SELECT last_insert_rowid() as id').get().id;
  });

  const insertEntry = db.prepare('INSERT OR IGNORE INTO entries (member_id, date, type) VALUES (?, ?, ?)');
  const insertHours = db.prepare('INSERT OR IGNORE INTO hours (member_id, date, start, end) VALUES (?, ?, ?, ?)');

  insertEntry.run(ids[0], today, 'vacation');
  insertEntry.run(ids[1], today, 'sick');
  insertEntry.run(ids[2], today, 'time_off');
  insertHours.run(ids[3], today, '08:30', '16:30');
  insertHours.run(ids[4], today, '09:00', '18:00');
  insertHours.run(ids[5], today, '07:00', '15:00');
  insertHours.run(ids[6], today, '09:00', '17:00');
  insertHours.run(ids[7], today, '10:00', '19:00');
}

module.exports = db;
