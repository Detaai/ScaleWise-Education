const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const session = require('express-session');

const db = require('./db');
const { renderPage } = require('./render');
const { SECTION_TYPES } = require('./sectionForms');
const adminRoutes = require('./routes/admin');

test('the seeded CMS contains the original public pages', () => {
  const pages = db.prepare('SELECT slug FROM pages ORDER BY nav_order').all();
  assert.ok(pages.length >= 13);
  assert.equal(pages[0].slug, 'home');
  assert.ok(pages.some(page => page.slug === 'contact'));
});

test('public pages render with navigation and migrated content', () => {
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get('home');
  const sections = db.prepare('SELECT * FROM sections WHERE page_id = ? ORDER BY position').all(page.id);
  const html = renderPage(page, sections);

  assert.match(html, /<title>ScaleWise Education \| ScaleWise Education<\/title>/);
  assert.match(html, /Book a Program/);
  assert.match(html, /Hands-on reptile and wildlife education/);
});

test('the page builder exposes supported section types', () => {
  assert.deepEqual(SECTION_TYPES, ['html', 'hero', 'cta', 'imagegrid', 'faq', 'cards']);
});

test('the admin dashboard shows pages hidden from the main navigation', async () => {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  }));
  app.use('/admin', adminRoutes);

  const server = app.listen(0);
  const { port } = server.address();

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('ScaleWise');
  if (!user) {
    const bcrypt = require('bcryptjs');
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run('ScaleWise', bcrypt.hashSync('Learn2016', 10));
  }

  try {
    const loginResponse = await fetch(`http://127.0.0.1:${port}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=ScaleWise&password=Learn2016',
      redirect: 'manual',
    });

    const cookie = loginResponse.headers.get('set-cookie');
    const response = await fetch(`http://127.0.0.1:${port}/admin`, {
      headers: cookie ? { Cookie: cookie.split(';')[0] } : {},
    });
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /Hidden from navigation/i);
    assert.match(html, /href="\/[a-z0-9-]+\.html" target="_blank"/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
