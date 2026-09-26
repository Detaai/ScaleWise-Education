const fs = require('fs');
const os = require('os');
const path = require('path');
const { ZipArchive } = require('archiver');
const db = require('./db');
const { renderPage } = require('./render');

const ROOT = path.join(__dirname, '..');
const PUBLIC_ASSETS = ['css', 'js', 'images', 'documents'];

function buildPublishPackage() {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scalewise-publish-'));
  const pages = db.prepare('SELECT * FROM pages ORDER BY nav_order ASC, title ASC').all();

  for (const directory of PUBLIC_ASSETS) {
    fs.cpSync(path.join(ROOT, directory), path.join(outputDir, directory), { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');

  for (const page of pages) {
    const sections = db.prepare('SELECT * FROM sections WHERE page_id = ? ORDER BY position ASC').all(page.id);
    const filename = page.slug === 'home' ? 'index.html' : `${page.slug}.html`;
    fs.writeFileSync(path.join(outputDir, filename), renderPage(page, sections));
  }

  return { outputDir, pageCount: pages.length };
}

function streamPublishZip(res) {
  const { outputDir, pageCount } = buildPublishPackage();
  const archive = new ZipArchive({ zlib: { level: 9 } });

  res.attachment('scalewise-publish.zip');
  archive.on('error', error => {
    fs.rmSync(outputDir, { recursive: true, force: true });
    if (!res.headersSent) res.status(500).send('Could not create publish package');
    else res.destroy(error);
  });
  res.on('finish', () => fs.rmSync(outputDir, { recursive: true, force: true }));

  archive.pipe(res);
  archive.directory(outputDir, false);
  archive.append(`ScaleWise Education publish package\nPages: ${pageCount}\nGenerated: ${new Date().toISOString()}\n`, {
    name: 'PUBLISH-INFO.txt',
  });
  archive.finalize();
}

module.exports = { buildPublishPackage, streamPublishZip };
