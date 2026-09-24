require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

require('./db'); // initializes and seeds the database on first run

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production' &&
    (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'scalewise-dev-secret-change-me')) {
  throw new Error('SESSION_SECRET must be set to a strong value in production.');
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'scalewise-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

// Static assets shared by both the public site and the admin UI.
app.use('/css', express.static(path.join(ROOT, 'css')));
app.use('/js', express.static(path.join(ROOT, 'js')));
app.use('/images', express.static(path.join(ROOT, 'images')));
app.use('/documents', express.static(path.join(ROOT, 'documents')));

app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

app.use((req, res) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`ScaleWise Education site running at http://localhost:${PORT}`);
  console.log(`Admin CMS available at http://localhost:${PORT}/admin`);
});
