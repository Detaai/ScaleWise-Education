const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function generateAnimalManifest(root = ROOT) {
  const directory = path.join(root, 'images', 'round-about');
  const animals = {};
  const folders = fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^animal\s+\d+$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));

  for (const folder of folders) {
    const images = fs.readdirSync(path.join(directory, folder.name), { withFileTypes: true })
      .filter(entry => entry.isFile() && /\.(jpe?g|png|webp|gif)$/i.test(entry.name))
      .map(entry => `images/round-about/${folder.name}/${entry.name}`)
      .sort();
    if (images.length) animals[folder.name] = images;
  }

  const manifestPath = path.join(directory, 'manifest.json');
  const content = JSON.stringify({ animals }, null, 2) + '\n';
  if (fs.existsSync(manifestPath) && fs.readFileSync(manifestPath, 'utf8') === content) {
    return false;
  }
  fs.writeFileSync(manifestPath, content);
  return true;
}

function watchAnimalImages(root = ROOT) {
  // Polling also detects changes reliably in OneDrive-backed folders on Windows.
  return setInterval(() => {
    if (generateAnimalManifest(root)) console.log('Animal photo list updated from folders.');
  }, 1000);
}

if (require.main === module) {
  const update = () => {
    if (generateAnimalManifest()) console.log('Animal photo list updated from folders.');
  };
  update();
  if (process.argv.includes('--watch')) {
    console.log('Watching animal photo folders. Keep this running alongside Live Server.');
    watchAnimalImages();
  }
}

module.exports = { generateAnimalManifest, watchAnimalImages };
