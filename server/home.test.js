const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'home.js'), 'utf8');

async function loadPage(animals, storage = new Map(), options = {}) {
  const photos = ['Animal 1/BallPython-image-1.png', 'Animal 2/Gopher-image-1.png'].map(file => ({
    src: encodeURI('images/round-about/' + file),
    alt: 'Original animal description',
    getAttribute(name) { return this[name]; },
  }));
  const events = {};
  const errors = [];
  const warnings = [];
  const context = {
    document: {
      querySelectorAll() { return photos; },
      getElementById() { return null; },
    },
    window: {
      sessionStorage: {
        getItem(key) {
          if (options.blockStorage) throw new Error('Storage blocked');
          return storage.get(key);
        },
        setItem(key, value) {
          if (options.blockStorage) throw new Error('Storage blocked');
          storage.set(key, value);
        },
      },
      addEventListener(name, handler) { events[name] = handler; },
    },
    fetch: async () => ({ ok: !options.fetchFailure, json: async () => ({ animals }) }),
    console: {
      error(...args) { errors.push(args); },
      warn(...args) { warnings.push(args); },
    },
    setInterval() { assert.fail('Crew photos must not rotate on a timer'); },
    setTimeout() { assert.fail('Crew photos must not rotate on a timer'); },
  };
  vm.runInNewContext(script, context);
  await new Promise(resolve => setImmediate(resolve));
  return { photos, events, errors, warnings };
}

const animals = {
  'Animal 1': [
    'images/round-about/Animal 1/BallPython-image-1.png',
    'images/round-about/Animal 1/Charlie-2.png',
  ],
  'Animal 2': [
    'images/round-about/Animal 2/Gopher-image-1.png',
    'images/round-about/Animal 2/Mystery-2.png',
  ],
};

test('crew photos stay with their animals and change on reload and cached return only', async () => {
  const storage = new Map();
  const first = await loadPage(animals, storage);
  assert.deepEqual(first.errors, []);
  first.photos.forEach((photo, index) => {
    assert.equal(decodeURI(photo.src), animals['Animal ' + (index + 1)][1]);
    assert.equal(photo.alt, 'Original animal description');
  });
  const unchanged = first.photos.map(photo => photo.src);
  first.events.pageshow({ persisted: false });
  assert.deepEqual(first.photos.map(photo => photo.src), unchanged);

  const reload = await loadPage(animals, storage);
  reload.photos.forEach((photo, index) => {
    assert.equal(decodeURI(photo.src), animals['Animal ' + (index + 1)][0]);
  });
  reload.events.pageshow({ persisted: true });
  reload.photos.forEach((photo, index) => {
    assert.equal(decodeURI(photo.src), animals['Animal ' + (index + 1)][1]);
  });
});

test('single-photo animals retain their photo', async () => {
  const single = Object.fromEntries(Object.entries(animals).map(([name, images]) => [name, images.slice(0, 1)]));
  const page = await loadPage(single);
  assert.deepEqual(page.errors, []);
  page.events.pageshow({ persisted: true });
  page.photos.forEach((photo, index) => {
    assert.equal(decodeURI(photo.src), single['Animal ' + (index + 1)][0]);
  });
});

test('blocked storage is reported without preventing photo selection', async () => {
  const page = await loadPage(animals, new Map(), { blockStorage: true });
  assert.deepEqual(page.errors, []);
  assert.equal(page.warnings.length, 4);
  page.photos.forEach((photo, index) => {
    assert.equal(decodeURI(photo.src), animals['Animal ' + (index + 1)][1]);
  });
});

test('manifest failures are reported and keep the original photos', async () => {
  for (const options of [{ fetchFailure: true }, {}]) {
    const page = await loadPage({}, new Map(), options);
    assert.equal(page.errors.length, 1);
    page.photos.forEach((photo, index) => {
      assert.equal(decodeURI(photo.src), animals['Animal ' + (index + 1)][0]);
    });
  }
});

test('home crew cards match existing animal folders and manifest photos', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'images', 'round-about', 'manifest.json'), 'utf8'));
  const cards = [...html.matchAll(/<article class="test-crew-card">([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 2);
  cards.forEach(([_, card], index) => {
    const src = decodeURI(card.match(/<img src="([^"]+)"/)[1]);
    assert.ok(manifest.animals['Animal ' + (index + 1)].includes(src));
  });
  Object.values(manifest.animals).flat().forEach(src => {
    assert.ok(fs.existsSync(path.join(root, ...src.split('/'))), src);
  });
  Object.entries(manifest.animals).forEach(([animal, images]) => {
    const files = fs.readdirSync(path.join(root, 'images', 'round-about', animal))
      .filter(file => /\.(jpe?g|png|webp|gif)$/i.test(file))
      .map(file => 'images/round-about/' + animal + '/' + file);
    assert.deepEqual([...images].sort(), files.sort(), 'Regenerate the photo manifest for ' + animal);
  });
});
