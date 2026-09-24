const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../db');
const { requireAuth, findUserByUsername, verifyPassword, updatePassword } = require('../auth');
const { adminLayout, escapeHtml } = require('../adminLayout');
const { SPECS, SECTION_TYPES } = require('../sectionForms');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'images', 'uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|gif|webp|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

// ---------- Auth ----------

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  const error = req.query.error ? '<p class="flash" style="background:#fdecea;border-color:#a33;color:#a33;">Invalid username or password.</p>' : '';
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admin Login | ScaleWise</title>
  <style>body{font-family:system-ui,Arial,sans-serif;background:#f6f7f3;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
  form{background:#fff;padding:32px;border-radius:10px;border:1px solid #ddd;width:320px;}
  input{width:100%;padding:9px;margin:6px 0 16px;border:1px solid #ccc;border-radius:6px;}
  button{width:100%;padding:10px;background:#2f5d3a;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer;}
  h1{font-size:1.3rem;margin-top:0;}</style></head><body>
  <form method="post" action="/admin/login">
    <h1>ScaleWise Admin Login</h1>
    ${error}
    <label>Username</label>
    <input type="text" name="username" required autofocus>
    <label>Password</label>
    <input type="password" name="password" required>
    <button type="submit">Log in</button>
  </form></body></html>`);
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = findUserByUsername(username || '');
  if (!user || !verifyPassword(user, password || '')) {
    return res.redirect('/admin/login?error=1');
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// Everything below requires login.
router.use(requireAuth);

router.get('/account', (req, res) => {
  res.send(adminLayout({
    title: 'Account',
    flash: req.query.saved ? 'Password updated.' : (req.query.error ? 'Could not update password. Check your current password and try again.' : ''),
    body: `
      <h1>Account</h1>
      <div class="card">
        <p>Logged in as <strong>${escapeHtml(req.session.username)}</strong>.</p>
        <form method="post" action="/admin/account">
          <label>Current Password</label>
          <input type="password" name="currentPassword" required>
          <label>New Password</label>
          <input type="password" name="newPassword" required minlength="8">
          <div style="margin-top:16px;"><button class="btn" type="submit">Update Password</button></div>
        </form>
      </div>
    `,
  }));
});

router.post('/account', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!verifyPassword(user, req.body.currentPassword || '')) {
    return res.redirect('/admin/account?error=1');
  }
  updatePassword(user.id, req.body.newPassword);
  res.redirect('/admin/account?saved=1');
});

// ---------- Dashboard ----------

router.get('/', (req, res) => {
  const pages = db.prepare('SELECT * FROM pages ORDER BY nav_order ASC, title ASC').all();
  const rows = pages.map(p => `
    <tr>
      <td>${escapeHtml(p.title)}</td>
      <td class="muted">/${p.slug === 'home' ? '' : p.slug + '.html'}</td>
      <td>${p.in_nav ? 'Yes' : 'No'}</td>
      <td>
        <a class="btn small" href="/admin/pages/${p.id}">Edit</a>
        ${p.slug === 'home' ? '' : `<form style="display:inline" method="post" action="/admin/pages/${p.id}/delete" onsubmit="return confirm('Delete this page and all its content?');"><button class="btn small danger" type="submit">Delete</button></form>`}
      </td>
    </tr>`).join('');
  const hiddenPages = pages.filter(page => !page.in_nav);
  const hiddenRows = hiddenPages.length
    ? hiddenPages.map(page => {
        const publicHref = page.slug === 'home' ? '/' : `/${page.slug}.html`;
        return `
      <tr>
        <td>${escapeHtml(page.title)}</td>
        <td class="muted">${publicHref}</td>
        <td>
          <a class="btn small" href="${publicHref}" target="_blank" rel="noopener noreferrer">Inspect</a>
          ${page.slug === 'home' ? '' : `<form style="display:inline" method="post" action="/admin/pages/${page.id}/delete" onsubmit="return confirm('Delete this page and all its content?');"><button class="btn small danger" type="submit">Delete</button></form>`}
        </td>
      </tr>`;
      }).join('')
    : '<tr><td colspan="3" class="muted">No pages are hidden from the main navigation.</td></tr>';

  res.send(adminLayout({
    title: 'Dashboard',
    flash: req.query.msg || '',
    body: `
      <h1>Pages</h1>
      <div class="card">
        <table>
          <thead><tr><th>Title</th><th>URL</th><th>In Nav</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="card">
        <h2>Hidden from navigation</h2>
        <table>
          <thead><tr><th>Title</th><th>URL</th><th>Actions</th></tr></thead>
          <tbody>${hiddenRows}</tbody>
        </table>
      </div>
      <div class="card">
        <h2>Add a New Page</h2>
        <form method="post" action="/admin/pages">
          <label>Page Title</label>
          <input type="text" name="title" required placeholder="e.g. Events">
          <label>URL slug (letters, numbers, hyphens only)</label>
          <input type="text" name="slug" required placeholder="e.g. events" pattern="[a-z0-9-]+">
          <div class="row" style="margin-top:12px;">
            <label style="margin:0;"><input type="checkbox" name="in_nav" value="1" checked style="width:auto;display:inline-block;"> Show in navigation menu</label>
          </div>
          <div style="margin-top:16px;"><button class="btn" type="submit">Create Page</button></div>
        </form>
      </div>
    `,
  }));
});

router.post('/', (req, res) => res.redirect('/admin'));

router.post('/pages', (req, res) => {
  const title = (req.body.title || '').trim();
  const slug = (req.body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!title || !slug || slug === 'home') {
    return res.redirect('/admin?msg=' + encodeURIComponent('Title and a valid slug are required.'));
  }
  const existing = db.prepare('SELECT id FROM pages WHERE slug = ?').get(slug);
  if (existing) {
    return res.redirect('/admin?msg=' + encodeURIComponent('That slug is already in use.'));
  }
  const maxOrder = db.prepare('SELECT MAX(nav_order) AS m FROM pages').get().m || 0;
  const info = db.prepare(`
    INSERT INTO pages (slug, title, meta_description, nav_label, in_nav, nav_order, body_class)
    VALUES (?, ?, '', ?, ?, ?, '')
  `).run(slug, title, title, req.body.in_nav ? 1 : 0, maxOrder + 1);
  db.prepare(`INSERT INTO sections (page_id, type, position, content) VALUES (?, 'html', 0, ?)`)
    .run(info.lastInsertRowid, JSON.stringify({ html: `<section class="section"><div class="container"><div class="section-title"><h1>${escapeHtml(title)}</h1></div></div></section>` }));
  res.redirect(`/admin/pages/${info.lastInsertRowid}`);
});

router.post('/pages/:id/delete', (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (page && page.slug !== 'home') {
    db.prepare('DELETE FROM pages WHERE id = ?').run(page.id);
  }
  res.redirect('/admin');
});

// ---------- Page editor ----------

function sectionEditorHtml(section) {
  const spec = SPECS[section.type];
  let content;
  try { content = JSON.parse(section.content); } catch (e) { content = {}; }
  if (!spec) {
    return `<div class="section-block"><p>Unknown section type: ${escapeHtml(section.type)}</p></div>`;
  }
  const fields = spec.toFields(content);
  const fieldsHtml = Object.entries(fields).map(([name, value]) => {
    const isBig = ['html', 'cards', 'images', 'items', 'body', 'intro'].includes(name);
    if (name === 'columns') {
      return `<label>Columns</label>
        <select name="columns">
          <option value="3" ${value === '3' ? 'selected' : ''}>3 columns</option>
          <option value="2" ${value === '2' ? 'selected' : ''}>2 columns</option>
        </select>`;
    }
    const tag = isBig ? `<textarea class="${name === 'html' ? 'tall' : ''}" name="${name}">${escapeHtml(value)}</textarea>` : `<input type="text" name="${name}" value="${escapeHtml(value)}">`;
    return `<label>${escapeHtml(name)}</label>${tag}`;
  }).join('');

  return `
    <div class="section-block">
      <div class="row" style="justify-content:space-between;">
        <h3><span class="pill">${escapeHtml(section.type)}</span> ${escapeHtml(spec.label)}</h3>
        <div class="row">
          <form method="post" action="/admin/sections/${section.id}/move"><input type="hidden" name="direction" value="up"><button class="btn small secondary" type="submit">&uarr; Up</button></form>
          <form method="post" action="/admin/sections/${section.id}/move"><input type="hidden" name="direction" value="down"><button class="btn small secondary" type="submit">&darr; Down</button></form>
          <form method="post" action="/admin/sections/${section.id}/delete" onsubmit="return confirm('Delete this section?');"><button class="btn small danger" type="submit">Delete</button></form>
        </div>
      </div>
      <form method="post" action="/admin/sections/${section.id}">
        ${fieldsHtml}
        <div style="margin-top:12px;"><button class="btn" type="submit">Save Section</button></div>
      </form>
    </div>`;
}

router.get('/pages/:id', (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).send('Page not found');
  const sections = db.prepare('SELECT * FROM sections WHERE page_id = ? ORDER BY position ASC').all(page.id);

  const addSectionOptions = SECTION_TYPES.map(t => `<option value="${t}">${escapeHtml(SPECS[t].label)} (${t})</option>`).join('');

  res.send(adminLayout({
    title: `Edit: ${page.title}`,
    flash: req.query.msg || '',
    body: `
      <p><a href="/admin">&larr; Back to all pages</a></p>
      <h1>${escapeHtml(page.title)}</h1>

      <div class="card">
        <h2>Page Settings</h2>
        <form method="post" action="/admin/pages/${page.id}/settings">
          <label>Title (used in browser tab and nav if label is blank)</label>
          <input type="text" name="title" value="${escapeHtml(page.title)}" required>
          <label>Meta Description (for search engines)</label>
          <textarea name="meta_description">${escapeHtml(page.meta_description)}</textarea>
          <label>Navigation Label</label>
          <input type="text" name="nav_label" value="${escapeHtml(page.nav_label)}">
          <label>Navigation Order (lower numbers appear first)</label>
          <input type="number" name="nav_order" value="${page.nav_order}">
          <div class="row" style="margin-top:12px;">
            <label style="margin:0;"><input type="checkbox" name="in_nav" value="1" ${page.in_nav ? 'checked' : ''} style="width:auto;display:inline-block;"> Show in navigation menu</label>
          </div>
          <div style="margin-top:16px;"><button class="btn" type="submit">Save Settings</button></div>
        </form>
      </div>

      <div class="card">
        <h2>Upload an Image</h2>
        <p class="muted">Upload a photo, then copy its path into an Image Grid section's field below (format: <code>path | alt text | caption</code>).</p>
        <form method="post" action="/admin/uploads" enctype="multipart/form-data">
          <input type="hidden" name="redirect" value="/admin/pages/${page.id}">
          <input type="file" name="image" accept="image/*" required>
          <div style="margin-top:12px;"><button class="btn" type="submit">Upload</button></div>
        </form>
      </div>

      <h2>Sections</h2>
      ${sections.map(sectionEditorHtml).join('') || '<p class="muted">No sections yet — add one below.</p>'}

      <div class="card">
        <h2>Add Section</h2>
        <form method="post" action="/admin/pages/${page.id}/sections">
          <label>Section Type</label>
          <select name="type">${addSectionOptions}</select>
          <div style="margin-top:16px;"><button class="btn" type="submit">Add Section</button></div>
        </form>
      </div>
    `,
  }));
});

router.post('/pages/:id/settings', (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).send('Page not found');
  db.prepare(`
    UPDATE pages SET title = ?, meta_description = ?, nav_label = ?, in_nav = ?, nav_order = ?
    WHERE id = ?
  `).run(
    (req.body.title || page.title).trim(),
    req.body.meta_description || '',
    req.body.nav_label || '',
    req.body.in_nav ? 1 : 0,
    Number(req.body.nav_order) || 0,
    page.id
  );
  res.redirect(`/admin/pages/${page.id}?msg=` + encodeURIComponent('Page settings saved.'));
});

router.post('/pages/:id/sections', (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).send('Page not found');
  const type = SECTION_TYPES.includes(req.body.type) ? req.body.type : 'html';
  const maxPos = db.prepare('SELECT MAX(position) AS m FROM sections WHERE page_id = ?').get(page.id).m;
  const nextPos = (maxPos === null ? -1 : maxPos) + 1;
  const emptyContent = SPECS[type].fromFields({});
  db.prepare('INSERT INTO sections (page_id, type, position, content) VALUES (?, ?, ?, ?)')
    .run(page.id, type, nextPos, JSON.stringify(emptyContent));
  res.redirect(`/admin/pages/${page.id}?msg=` + encodeURIComponent('Section added.'));
});

router.post('/sections/:id', (req, res) => {
  const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.id);
  if (!section) return res.status(404).send('Section not found');
  const spec = SPECS[section.type];
  const content = spec.fromFields(req.body);
  db.prepare('UPDATE sections SET content = ? WHERE id = ?').run(JSON.stringify(content), section.id);
  res.redirect(`/admin/pages/${section.page_id}?msg=` + encodeURIComponent('Section saved.'));
});

router.post('/sections/:id/delete', (req, res) => {
  const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.id);
  if (!section) return res.status(404).send('Section not found');
  db.prepare('DELETE FROM sections WHERE id = ?').run(section.id);
  res.redirect(`/admin/pages/${section.page_id}?msg=` + encodeURIComponent('Section deleted.'));
});

router.post('/sections/:id/move', (req, res) => {
  const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.id);
  if (!section) return res.status(404).send('Section not found');
  const direction = req.body.direction === 'up' ? -1 : 1;
  const neighbor = db.prepare(
    direction === -1
      ? 'SELECT * FROM sections WHERE page_id = ? AND position < ? ORDER BY position DESC LIMIT 1'
      : 'SELECT * FROM sections WHERE page_id = ? AND position > ? ORDER BY position ASC LIMIT 1'
  ).get(section.page_id, section.position);

  if (neighbor) {
    const tx = db.transaction(() => {
      db.prepare('UPDATE sections SET position = ? WHERE id = ?').run(neighbor.position, section.id);
      db.prepare('UPDATE sections SET position = ? WHERE id = ?').run(section.position, neighbor.id);
    });
    tx();
  }
  res.redirect(`/admin/pages/${section.page_id}`);
});

// ---------- Image uploads ----------

router.post('/uploads', (req, res) => {
  upload.single('image')(req, res, (err) => {
    const redirectTo = req.body.redirect || '/admin';
    if (err) {
      return res.redirect(redirectTo + '?msg=' + encodeURIComponent('Upload failed: ' + err.message));
    }
    if (!req.file) {
      return res.redirect(redirectTo + '?msg=' + encodeURIComponent('No file was uploaded.'));
    }
    const publicPath = `images/uploads/${req.file.filename}`;
    res.redirect(redirectTo + '?msg=' + encodeURIComponent(`Uploaded: ${publicPath} (copy this path into an image field)`));
  });
});

module.exports = router;
