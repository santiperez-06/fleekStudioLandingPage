/**
 * FLEEK studio — api/auth.js
 * Tecnología: Node.js — jsonwebtoken, bcryptjs
 * Scope: Login y logout del panel de administración.
 *        Un único usuario admin definido en .env
 */

'use strict';

const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Responde con { token } o error 401
 */
async function login(req, res) {
  const { username, password } = req.body || {};
  try {

  if (!username || !password) {
    return res.status(400).json({ error: 'Faltan credenciales.' });
  }

  const validUser = username === process.env.ADMIN_USER;

  // Comparar contra el hash guardado en .env
  // Si ADMIN_PASS_HASH no existe, comparar en texto plano como fallback de desarrollo
  let validPass = false;
  if (process.env.ADMIN_PASS_HASH) {
    validPass = await bcrypt.compare(password, process.env.ADMIN_PASS_HASH);
  } else if (process.env.ADMIN_PASS && process.env.NODE_ENV !== 'production') {
    // Solo para desarrollo local — BLOQUEADO en producción
    validPass = password === process.env.ADMIN_PASS;
  }

  if (!validUser || !validPass) {
    // Delay artificial para evitar timing attacks
    await new Promise(r => setTimeout(r, 400));
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  // Enviar token en cookie httpOnly (más seguro que localStorage)
  res.cookie('fleek_admin_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   8 * 60 * 60 * 1000, // 8 horas en ms
  });

  return res.json({ ok: true, username });
  } catch (err) {
    console.error('[login error]', err);
    return res.status(500).json({ error: 'Error interno.' });
  }
}

/**
 * POST /api/auth/logout
 * Limpia la cookie de sesión
 */
function logout(req, res) {
  res.clearCookie('fleek_admin_token');
  return res.json({ ok: true });
}

/**
 * GET /api/auth/me
 * Verifica si hay sesión activa — usado por el frontend al cargar /admin
 */
function me(req, res) {
  const token = req.cookies?.fleek_admin_token;
  if (!token) return res.status(401).json({ error: 'No autenticado.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ ok: true, username: payload.username });
  } catch {
    return res.status(401).json({ error: 'Sesión expirada.' });
  }
}

module.exports = { login, logout, me };