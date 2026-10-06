const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, '..', 'data', 'scalewise.db');
const isNewDb = !fs.existsSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

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

  CREATE TABLE IF NOT EXISTS adoption_animals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    morph TEXT NOT NULL DEFAULT '',
    sex TEXT NOT NULL DEFAULT '',
    age TEXT NOT NULL DEFAULT '',
    adoption_fee REAL NOT NULL DEFAULT 0,
    minimum_enclosure TEXT NOT NULL DEFAULT '',
    diet TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image_path TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'available'
      CHECK (status IN ('available', 'on_hold', 'adopted')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS adoption_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_code_hash TEXT UNIQUE NOT NULL,
    animal_id INTEGER REFERENCES adoption_animals(id) ON DELETE SET NULL,
    animal_name TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    setup_photo_filename TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'received'
      CHECK (status IN ('received', 'under_review', 'need_info', 'approved', 'not_approved', 'completed')),
    admin_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
