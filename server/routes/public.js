const express = require('express');
const db = require('../db');
const { renderPage } = require('../render');

const router = express.Router();

function getPageBySlug(slug) {
  return db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
}

function getSectionsForPage(pageId) {
  return db.prepare('SELECT * FROM sections WHERE page_id = ? ORDER BY position ASC').all(pageId);
}

function servePage(slug) {
  return (req, res) => {
    const page = getPageBySlug(slug);
    if (!page) return res.status(404).send('Page not found');
    const sections = getSectionsForPage(page.id);
    res.send(renderPage(page, sections));
  };
}

// Home page is served at both "/" and "/index.html" to match the original static URLs.
router.get(['/', '/index.html'], servePage('home'));

// Hidden admin shortcut: accessible only by direct URL and not in public navigation.
router.get('/_admin', (req, res) => {
  res.redirect('/admin/login');
});

// All other pages, keeping the original .html URLs so existing links keep working.
router.get('/:slug.html', (req, res, next) => {
  if (req.params.slug === '_admin') return next();
  const page = getPageBySlug(req.params.slug);
  if (!page || page.slug === 'home') return next();
  const sections = getSectionsForPage(page.id);
  res.send(renderPage(page, sections));
});

module.exports = router;
