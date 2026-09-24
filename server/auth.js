const bcrypt = require('bcryptjs');
const db = require('./db');

function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

function updatePassword(userId, newPassword) {
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect('/admin/login');
}

module.exports = { findUserByUsername, verifyPassword, updatePassword, requireAuth };
