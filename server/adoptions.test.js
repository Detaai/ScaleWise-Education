const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const db = require('./db');
const adoptionRoutes = require('./routes/adoptions');
const adminRoutes = require('./routes/admin');

test('adoption listings and application tracking work without exposing applicant data', async () => {
  const marker = `Portal test ${crypto.randomBytes(6).toString('hex')}`;
  const insertAnimal = db.prepare(`
    INSERT INTO adoption_animals (name, species, status) VALUES (?, 'Test species', ?)
  `);
  const availableId = insertAnimal.run(`${marker} available`, 'available').lastInsertRowid;
  const hiddenId = insertAnimal.run(`${marker} hidden`, 'on_hold').lastInsertRowid;
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use('/api/adoptions', adoptionRoutes);
  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/adoptions`;
  let applicationId;
  let photoPath;

  try {
    const listingResponse = await fetch(`${baseUrl}/animals`);
    const listings = await listingResponse.json();
    assert.equal(listingResponse.status, 200);
    assert.ok(listings.animals.some(animal => animal.id === availableId));
    assert.ok(!listings.animals.some(animal => animal.id === hiddenId));

    const submission = new FormData();
    submission.set('name', 'Test Applicant');
    submission.set('email', 'test-applicant@example.com');
    submission.set('animalId', String(availableId));
    submission.set('message', 'Testing the adoption workflow.');
    submission.set('setupPhoto', new Blob(['test image bytes'], { type: 'image/png' }), 'setup.png');
    const submitResponse = await fetch(`${baseUrl}/applications`, { method: 'POST', body: submission });
    const submitted = await submitResponse.json();
    assert.equal(submitResponse.status, 201);
    assert.match(submitted.trackingCode, /^[A-F0-9]{32}$/);

    const codeHash = crypto.createHash('sha256').update(submitted.trackingCode).digest('hex');
    const application = db.prepare(`
      SELECT id, setup_photo_filename FROM adoption_applications WHERE tracking_code_hash = ?
    `).get(codeHash);
    applicationId = application.id;
    photoPath = path.join(__dirname, '..', 'data', 'adoption-uploads', application.setup_photo_filename);
    assert.ok(fs.existsSync(photoPath));

    const invalidLookup = await fetch(`${baseUrl}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ trackingCode: submitted.trackingCode, email: 'wrong@example.com' }),
    });
    assert.equal(invalidLookup.status, 404);

    db.prepare(`
      UPDATE adoption_applications SET status = 'under_review' WHERE id = ?
    `).run(applicationId);
    const lookupResponse = await fetch(`${baseUrl}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ trackingCode: submitted.trackingCode, email: 'TEST-APPLICANT@example.com' }),
    });
    const lookup = await lookupResponse.json();
    assert.equal(lookupResponse.status, 200);
    assert.equal(lookup.application.status, 'under_review');
    assert.equal(lookup.application.animalName, `${marker} available`);
    assert.equal(Object.hasOwn(lookup.application, 'applicantEmail'), false);
    assert.equal(Object.hasOwn(lookup.application, 'adminNotes'), false);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (photoPath && fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    if (applicationId) db.prepare('DELETE FROM adoption_applications WHERE id = ?').run(applicationId);
    db.prepare('DELETE FROM adoption_animals WHERE id IN (?, ?)').run(availableId, hiddenId);
  }
});

test('the signed-in adoption admin can create and unlist an animal', async () => {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use((_req, _res, next) => {
    _req.session = { userId: 1, username: 'test-admin' };
    next();
  });
  app.use('/admin', adminRoutes);
  app.use('/api/adoptions', adoptionRoutes);
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const marker = `Portal admin test ${crypto.randomBytes(6).toString('hex')}`;
  let animalId;

  try {
    const form = new FormData();
    form.set('name', marker);
    form.set('species', 'Test species');
    form.set('adoptionFee', '0');
    form.set('sex', 'Unknown');
    form.set('status', 'available');
    const createResponse = await fetch(`${baseUrl}/admin/adoptions/animals`, {
      method: 'POST',
      body: form,
      redirect: 'manual',
    });
    assert.equal(createResponse.status, 302);
    animalId = db.prepare('SELECT id FROM adoption_animals WHERE name = ?').get(marker).id;

    let listingsResponse = await fetch(`${baseUrl}/api/adoptions/animals`);
    let listings = await listingsResponse.json();
    assert.ok(listings.animals.some(animal => animal.id === animalId));

    const update = new FormData();
    update.set('name', marker);
    update.set('species', 'Test species');
    update.set('adoptionFee', '0');
    update.set('sex', 'Unknown');
    update.set('status', 'on_hold');
    const updateResponse = await fetch(`${baseUrl}/admin/adoptions/animals/${animalId}`, {
      method: 'POST',
      body: update,
      redirect: 'manual',
    });
    assert.equal(updateResponse.status, 302);

    listingsResponse = await fetch(`${baseUrl}/api/adoptions/animals`);
    listings = await listingsResponse.json();
    assert.ok(!listings.animals.some(animal => animal.id === animalId));
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (animalId) db.prepare('DELETE FROM adoption_animals WHERE id = ?').run(animalId);
  }
});
