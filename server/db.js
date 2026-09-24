const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'scalewise.db');
const isNewDb = !fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    meta_description TEXT DEFAULT '',
    nav_label TEXT DEFAULT '',
    in_nav INTEGER NOT NULL DEFAULT 1,
    nav_order INTEGER NOT NULL DEFAULT 0,
    body_class TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL DEFAULT '{}'
  );
`);

// Seed a default admin user on first run.
if (isNewDb) {
  const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
  const defaultPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const hash = bcrypt.hashSync(defaultPassword, 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(defaultUsername, hash);
  console.log('--------------------------------------------------------');
  console.log('Created default admin user:');
  console.log('  username:', defaultUsername);
  console.log('  password:', defaultPassword);
  console.log('Log in at /admin/login and CHANGE THIS PASSWORD from the');
  console.log('Admin > Account page immediately.');
  console.log('--------------------------------------------------------');

  require('./seed')(db);
}

module.exports = db;
