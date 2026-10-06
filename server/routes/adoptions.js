const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');

const router = express.Router();
const PRIVATE_UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'adoption-uploads');
fs.mkdirSync(PRIVATE_UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, PRIVATE_UPLOAD_DIR),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    };
    const extension = path.extname(file.originalname).toLowerCase();
    const valid = allowed[file.mimetype] && allowed[file.mimetype].includes(extension);
    callback(valid ? null : new Error('Upload a matching JPG, PNG, or WebP image.'), Boolean(valid));
  },
});

const PUBLIC_ANIMAL_FIELDS = `
  id, name, species, morph, sex, age, adoption_fee AS adoptionFee,
  minimum_enclosure AS minimumEnclosure, diet, description, image_path AS imagePath,
  created_at AS createdAt
`;

router.get('/animals', (_req, res) => {
  const animals = db.prepare(`
    SELECT ${PUBLIC_ANIMAL_FIELDS}
    FROM adoption_animals
    WHERE status = 'available'
    ORDER BY created_at DESC, id DESC
  `).all();
  res.json({ animals });
});

router.post('/applications', (req, res) => {
  upload.single('setupPhoto')(req, res, error => {
    if (error) {
      const statusCode = error instanceof multer.MulterError ? 400 : 400;
      return res.status(statusCode).json({ error: error.message });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const message = String(req.body.message || '').trim();
    const animalId = Number(req.body.animalId);

    if (!name || name.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Enter a valid name and email address.' });
    }
    if (!Number.isSafeInteger(animalId) || animalId < 1) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Choose an available animal.' });
    }
    if (message.length > 5000) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'The message must be 5,000 characters or fewer.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Upload a clear photo of the enclosure setup.' });
    }

    const animal = db.prepare(`
      SELECT id, name FROM adoption_animals
      WHERE id = ? AND status = 'available'
    `).get(animalId);
    if (!animal) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'That animal is no longer available. Refresh the listings and choose another.' });
    }

    const trackingCode = crypto.randomBytes(16).toString('hex').toUpperCase();
    const trackingCodeHash = crypto.createHash('sha256').update(trackingCode).digest('hex');
    try {
      db.prepare(`
        INSERT INTO adoption_applications
          (tracking_code_hash, animal_id, animal_name, applicant_name, applicant_email, setup_photo_filename, message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(trackingCodeHash, animal.id, animal.name, name, email, req.file.filename, message);
    } catch (insertError) {
      fs.unlinkSync(req.file.path);
      console.error('Could not save adoption application:', insertError);
      return res.status(500).json({ error: 'We could not save your application. Please try again.' });
    }

    res.status(201).json({
      message: 'Your application has been received.',
      trackingCode,
    });
  });
});

router.post('/status', (req, res) => {
  const trackingCode = String(req.body.trackingCode || '').trim().toUpperCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[A-F0-9]{32}$/.test(trackingCode) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter the tracking code and email address used on the application.' });
  }

  const trackingCodeHash = crypto.createHash('sha256').update(trackingCode).digest('hex');
  const application = db.prepare(`
    SELECT animal_name AS animalName, status, created_at AS submittedAt, updated_at AS updatedAt
    FROM adoption_applications
    WHERE tracking_code_hash = ? AND applicant_email = ?
  `).get(trackingCodeHash, email);

  if (!application) {
    return res.status(404).json({ error: 'No application matched that tracking code and email.' });
  }
  res.json({ application });
});

module.exports = router;
