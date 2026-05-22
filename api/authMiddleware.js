/**
 * FLEEK studio — api/authMiddleware.js
 * Tecnología: Node.js — jsonwebtoken
 * Scope: Middleware que protege las rutas de admin.
 *        Lee el token desde la cookie httpOnly.
 */

'use strict';

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.fleek_admin_token;

  if (!token) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión expirada. Iniciá sesión nuevamente.' });
  }
}

module.exports = requireAuth;