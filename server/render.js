// Renders full public pages (layout + sections) from data stored in SQLite.
const db = require('./db');

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getNav() {
  return db.prepare(`
    SELECT slug, nav_label AS navLabel FROM pages
    WHERE in_nav = 1 ORDER BY nav_order ASC
  `).all();
}

function slugToHref(slug) {
  return slug === 'home' ? 'index.html' : `${slug}.html`;
}

function renderNav(activeSlug) {
  const items = getNav().map(p => {
    const active = p.slug === activeSlug ? ' class="active"' : '';
    return `<li><a href="${slugToHref(p.slug)}"${active}>${escapeHtml(p.navLabel)}</a></li>`;
  }).join('\n      ');
  return items;
}

function renderButtons(buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) return '';
  return buttons.map((b, i) => {
    const style = b.style === 'outline' ? 'btn btn-outline' : 'btn btn-primary';
    const margin = i > 0 ? ' style="margin-left:12px;"' : '';
    return `<a href="${b.href || '#'}" class="${style}"${margin}>${b.text || ''}</a>`;
  }).join('\n    ');
}

// Each section type renderer receives parsed JSON `content`.
const sectionRenderers = {
  html(content) {
    return content.html || '';
  },
  hero(content) {
    const paras = (content.intro || []).map(p => `<p>${p}</p>`).join('\n    ');
    return `
  <section class="hero">
    <h1>${content.heading || ''}</h1>
    ${paras}
    ${renderButtons(content.buttons)}
  </section>`;
  },
  cards(content) {
    const cols = content.columns === 2 ? 'grid-2' : 'grid-3';
    const cards = (content.cards || []).map(c => `
        <div class="card">
          <h3>${c.title || ''}</h3>
          ${c.body || ''}
        </div>`).join('');
    return `
  <section class="section">
    <div class="container">
      <div class="section-title">
        <h2>${content.heading || ''}</h2>
        <p>${content.subheading || ''}</p>
      </div>
      <div class="grid ${cols}">${cards}
      </div>
    </div>
  </section>`;
  },
  imagegrid(content) {
    const images = (content.images || []).map(img => {
      if (img.src) {
        return `<div class="photo-placeholder" style="padding:0;"><img src="${img.src}" alt="${img.alt || ''}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"></div>`;
      }
      return `<div class="photo-placeholder">${img.caption || '[Photo]'}</div>`;
    }).join('\n        ');
    return `
  <section class="section">
    <div class="container">
      <div class="section-title">
        <h2>${content.heading || ''}</h2>
        <p>${content.subheading || ''}</p>
      </div>
      <div class="photo-grid">
        ${images}
      </div>
      ${content.note ? `<p class="placeholder-note">${content.note}</p>` : ''}
    </div>
  </section>`;
  },
  cta(content) {
    return `
  <section class="cta-band">
    <h2>${content.heading || ''}</h2>
    <p>${content.body || ''}</p>
    ${renderButtons(content.buttons)}
  </section>`;
  },
  faq(content) {
    const items = (content.items || []).map(i => `
      <div class="card" style="margin-bottom:16px;"><h3>${i.question || ''}</h3><p>${i.answer || ''}</p></div>`).join('');
    return `
  <section class="section">
    <div class="container">
      <div class="section-title">
        <h2>${content.heading || ''}</h2>
        <p>${content.subheading || ''}</p>
      </div>${items}
    </div>
  </section>`;
  },
};

function renderSection(section) {
  let content;
  try {
    content = JSON.parse(section.content);
  } catch (e) {
    content = {};
  }
  const renderer = sectionRenderers[section.type];
  return renderer ? renderer(content) : `<!-- unknown section type: ${section.type} -->`;
}

function renderPage(page, sections) {
  const bodyClass = page.body_class ? ` class="${page.body_class}"` : '';
  const sectionsHtml = sections.map(renderSection).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(page.title)} | ScaleWise Education</title>
${page.meta_description ? `<meta name="description" content="${escapeHtml(page.meta_description)}">` : ''}
<link rel="stylesheet" href="css/style.css">
</head>
<body${bodyClass}>

<header class="site-header">
  <div class="nav-wrapper">
    <a href="index.html" class="logo">
      <img src="images/logo.png" alt="ScaleWise Education logo" onerror="this.style.display='none'">
      ScaleWise Education
    </a>
    <button class="nav-toggle" aria-label="Toggle navigation">&#9776;</button>
    <ul class="nav-links">
      ${renderNav(page.slug)}
    </ul>
  </div>
</header>

<main>
${sectionsHtml}
</main>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <h4>ScaleWise Education</h4>
        <p>Hands-on reptile and wildlife education focused on understanding, respect, responsible interaction, and conservation.</p>
      </div>
      <div>
        <h4>Quick Links</h4>
        <ul>
          <li><a href="about.html">About Us</a></li>
          <li><a href="programs.html">Programs</a></li>
          <li><a href="faq.html">FAQ</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><a href="mailto:ScaleWiseEducation@gmail.com">ScaleWiseEducation@gmail.com</a></li>
          <li>Mohave County &amp; Kingman, AZ</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 ScaleWise Education. All rights reserved. | <a href="legal.html">Privacy Policy &amp; Terms</a></p>
    </div>
  </div>
</footer>

<script src="js/script.js"></script>
</body>
</html>
`;
}

module.exports = { renderPage, renderSection, getNav, slugToHref };
