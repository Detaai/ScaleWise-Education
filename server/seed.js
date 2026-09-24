// One-time seed: migrates the original static .html files into the database
// so the dynamic CMS starts out identical to the previously published site.
// Runs automatically the first time the database is created (see db.js).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEGACY_DIR = path.join(ROOT, 'legacy-static-backup');

// slug, source file (in legacy-static-backup), nav label, nav order, in_nav
const PAGES = [
  { slug: 'home', file: 'index.html', navLabel: 'Home', order: 0, inNav: true },
  { slug: 'about', file: 'about.html', navLabel: 'About Us', order: 1, inNav: true },
  { slug: 'programs', file: 'programs.html', navLabel: 'Programs', order: 2, inNav: true },
  { slug: 'species', file: 'species.html', navLabel: 'Species', order: 3, inNav: true },
  { slug: 'conservation', file: 'conservation.html', navLabel: 'Conservation', order: 4, inNav: true },
  { slug: 'animal-care', file: 'animal-care.html', navLabel: 'Animal Care', order: 5, inNav: true },
  { slug: 'faq', file: 'faq.html', navLabel: 'FAQ', order: 6, inNav: true },
  { slug: 'gallery', file: 'gallery.html', navLabel: 'Gallery', order: 7, inNav: true },
  { slug: 'reviews', file: 'reviews.html', navLabel: 'Reviews', order: 8, inNav: true },
  { slug: 'safety', file: 'safety.html', navLabel: 'Safety & Policies', order: 9, inNav: true },
  { slug: 'contact', file: 'contact.html', navLabel: 'Book a Program', order: 10, inNav: true },
  { slug: 'adoption', file: 'adoption.html', navLabel: 'Adopt an Animal', order: 11, inNav: false },
  { slug: 'legal', file: 'legal.html', navLabel: 'Legal', order: 12, inNav: false },
];

function extract(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function decodeEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractAttr(html, tag, attr) {
  const re = new RegExp(`<${tag}([^>]*)>`, 'i');
  const m = html.match(re);
  if (!m) return '';
  const attrRe = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i');
  const am = m[1].match(attrRe);
  return am ? am[1] : '';
}

module.exports = function seed(db) {
  if (!fs.existsSync(LEGACY_DIR)) {
    console.warn('seed: legacy-static-backup folder not found, skipping content import. Empty pages will be created.');
  }

  const insertPage = db.prepare(`
    INSERT INTO pages (slug, title, meta_description, nav_label, in_nav, nav_order, body_class)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSection = db.prepare(`
    INSERT INTO sections (page_id, type, position, content)
    VALUES (?, ?, ?, ?)
  `);

  for (const p of PAGES) {
    const filePath = path.join(LEGACY_DIR, p.file);
    let title = p.navLabel;
    let metaDescription = '';
    let bodyClass = '';
    let mainHtml = '<p><em>No content yet. Edit this page in the admin to add sections.</em></p>';

    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, 'utf8');
      const rawTitle = extract(html, 'title');
      title = decodeEntities(rawTitle.split('|')[0].trim()) || p.navLabel;
      metaDescription = decodeEntities(extractAttr(html, 'meta name="description"', 'content') || extractDescriptionAttr(html));
      bodyClass = extractAttr(html, 'body', 'class');
      const main = extract(html, 'main');
      if (main) mainHtml = main;
    }

    const info = insertPage.run(p.slug, title, metaDescription, p.navLabel, p.inNav ? 1 : 0, p.order, bodyClass);
    insertSection.run(info.lastInsertRowid, 'html', 0, JSON.stringify({ html: mainHtml }));
  }

  console.log(`seed: imported ${PAGES.length} pages from legacy static files.`);
};

function extractDescriptionAttr(html) {
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  return m ? m[1] : '';
}
