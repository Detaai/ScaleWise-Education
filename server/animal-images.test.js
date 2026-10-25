const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generateAnimalManifest, watchAnimalImages } = require('./animal-images');

test('photo discovery handles arbitrary names, gaps, additions, renames, and deletions', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scalewise-photo-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'images', 'round-about');
  const animal = path.join(directory, 'Animal 2');
  fs.mkdirSync(animal, { recursive: true });
  fs.mkdirSync(path.join(directory, 'Animal 1'));
  fs.mkdirSync(path.join(directory, 'unrelated'));
  fs.mkdirSync(path.join(animal, 'not-a-file.png'));
  for (const name of ['Gopher-image-1.png', 'Gopher-image-9.png', 'Mystery portrait.JPG', 'notes.txt']) {
    fs.writeFileSync(path.join(animal, name), '');
  }
  const read = () => JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8')).animals;
  assert.equal(generateAnimalManifest(root), true);
  assert.deepEqual(read(), {
    'Animal 2': [
      'images/round-about/Animal 2/Gopher-image-1.png',
      'images/round-about/Animal 2/Gopher-image-9.png',
      'images/round-about/Animal 2/Mystery portrait.JPG',
    ],
  });
  assert.equal(generateAnimalManifest(root), false);
  fs.renameSync(path.join(animal, 'Gopher-image-9.png'), path.join(animal, 'renamed.webp'));
  fs.unlinkSync(path.join(animal, 'Gopher-image-1.png'));
  fs.writeFileSync(path.join(directory, 'Animal 1', 'Charlie.gif'), '');
  assert.equal(generateAnimalManifest(root), true);
  assert.deepEqual(read(), {
    'Animal 1': ['images/round-about/Animal 1/Charlie.gif'],
    'Animal 2': [
      'images/round-about/Animal 2/Mystery portrait.JPG',
      'images/round-about/Animal 2/renamed.webp',
    ],
  });
});

test('development watcher automatically updates the list after a folder change', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scalewise-photo-watch-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'images', 'round-about');
  const animal = path.join(directory, 'Animal 1');
  fs.mkdirSync(animal, { recursive: true });
  generateAnimalManifest(root);
  const timer = watchAnimalImages(root);
  t.after(() => clearInterval(timer));
  fs.writeFileSync(path.join(animal, 'any name-27.png'), '');
  const deadline = Date.now() + 5000;
  let manifest;
  do {
    await new Promise(resolve => setTimeout(resolve, 100));
    manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  } while (!manifest.animals['Animal 1'] && Date.now() < deadline);
  assert.deepEqual(manifest.animals['Animal 1'], ['images/round-about/Animal 1/any name-27.png']);
});
