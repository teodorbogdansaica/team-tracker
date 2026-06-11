const express   = require('express');
const session   = require('express-session');
const bcrypt    = require('bcryptjs');
const path      = require('path');
const db        = require('./db');

const FileStore = require('session-file-store')(session);
const app  = express();
const PORT = process.env.PORT || 3000;

const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');

// ── Session ────────────────────────────────────────────────
app.use(express.json());
app.use(session({
  store: new FileStore({ path: path.join(dataDir, 'sessions'), retries: 1, logFn: () => {} }),
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// ── Bootstrap admin on first run ───────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const initPassword = process.env.ADMIN_INIT_PASSWORD || 'changeme123';
  const hash = bcrypt.hashSync(initPassword, 10);
  db.prepare('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)')
    .run('admin', hash);
  console.log(`\n===========================================`);
  console.log(`  Admin account created:`);
  console.log(`  Username : admin`);
  console.log(`  Password : ${initPassword}`);
  console.log(`  Change it after first login!`);
  console.log(`===========================================\n`);
}

// ── Auth middleware ────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(403).json({ error: 'Admin required' });
}

// ── Public: static login assets ───────────────────────────
app.use('/login', express.static(path.join(__dirname, 'public')));
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ── Auth routes ────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid username or password' });
  req.session.userId   = user.id;
  req.session.username = user.username;
  req.session.isAdmin  = user.is_admin === 1;
  res.json({ ok: true, username: user.username, isAdmin: user.is_admin === 1 });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ username: req.session.username, isAdmin: req.session.isAdmin });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Invalid input' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ error: 'Current password is wrong' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.session.userId);
  res.json({ ok: true });
});

// ── Protected from here ────────────────────────────────────
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

// ── Admin: user management ─────────────────────────────────
app.get('/api/admin/users', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT id, username, is_admin, created_at FROM users ORDER BY username').all());
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, password, is_admin } = req.body;
  if (!username || !password || password.length < 6)
    return res.status(400).json({ error: 'Username and password (min 6 chars) required' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)'
    ).run(username.trim().toLowerCase(), hash, is_admin ? 1 : 0);
    res.json(db.prepare('SELECT id, username, is_admin, created_at FROM users WHERE id = ?').get(lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.put('/api/admin/users/:id/reset-password', requireAdmin, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Min 6 chars' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.session.userId)
    return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Members ────────────────────────────────────────────────
app.get('/api/members', (req, res) => {
  res.json(db.prepare('SELECT * FROM members ORDER BY name').all());
});

app.post('/api/members', requireAdmin, (req, res) => {
  const { name, role, timezone, avatar, color } = req.body;
  if (!name || !role || !timezone || !avatar || !color)
    return res.status(400).json({ error: 'Missing fields' });
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO members (name, role, timezone, avatar, color) VALUES (?, ?, ?, ?, ?)'
  ).run(name, role, timezone, avatar, color);
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(lastInsertRowid));
});

app.put('/api/members/:id', requireAdmin, (req, res) => {
  const { name, role, timezone, avatar, color } = req.body;
  db.prepare('UPDATE members SET name=?, role=?, timezone=?, avatar=?, color=? WHERE id=?')
    .run(name, role, timezone, avatar, color, req.params.id);
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id));
});

app.delete('/api/members/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Entries ────────────────────────────────────────────────
app.get('/api/entries', (req, res) => {
  const { year, month } = req.query;
  const rows = (year && month)
    ? db.prepare("SELECT * FROM entries WHERE date LIKE ?").all(`${year}-${String(month).padStart(2,'0')}%`)
    : db.prepare('SELECT * FROM entries').all();
  res.json(rows);
});

app.put('/api/entries', (req, res) => {
  const { member_id, date, type } = req.body;
  if (!member_id || !date || !type) return res.status(400).json({ error: 'Missing fields' });
  db.prepare(
    'INSERT INTO entries (member_id, date, type) VALUES (?, ?, ?) ON CONFLICT(member_id, date) DO UPDATE SET type=excluded.type'
  ).run(member_id, date, type);
  res.json({ ok: true });
});

app.delete('/api/entries', (req, res) => {
  db.prepare('DELETE FROM entries WHERE member_id=? AND date=?').run(req.body.member_id, req.body.date);
  res.json({ ok: true });
});

// ── Hours ──────────────────────────────────────────────────
app.get('/api/hours', (req, res) => {
  const { date } = req.query;
  res.json(date
    ? db.prepare('SELECT * FROM hours WHERE date = ?').all(date)
    : db.prepare('SELECT * FROM hours').all()
  );
});

app.put('/api/hours', (req, res) => {
  const { member_id, date, start, end } = req.body;
  if (!member_id || !date || !start || !end) return res.status(400).json({ error: 'Missing fields' });
  db.prepare(
    'INSERT INTO hours (member_id, date, start, end) VALUES (?, ?, ?, ?) ON CONFLICT(member_id, date) DO UPDATE SET start=excluded.start, end=excluded.end'
  ).run(member_id, date, start, end);
  res.json({ ok: true });
});

app.delete('/api/hours', (req, res) => {
  db.prepare('DELETE FROM hours WHERE member_id=? AND date=?').run(req.body.member_id, req.body.date);
  res.json({ ok: true });
});

// ── Fallback ───────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Team Tracker running on port ${PORT}`));
