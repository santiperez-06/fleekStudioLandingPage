/**
 * FLEEK studio — server.js
 * Tecnología: Node.js + Express
 * Scope: Servidor principal — estáticos + API pública + API admin protegida
 */

'use strict';

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');

const contactHandler        = require('./api/contact');
const { login, logout, me } = require('./api/auth');
const requireAuth           = require('./api/authMiddleware');
const admin                 = require('./api/admin');

const app     = express();
const PORT    = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

/* ---- Validación de variables críticas al arrancar ---- */
const REQUIRED_ENV = ['JWT_SECRET', 'ADMIN_USER'];
if (IS_PROD) REQUIRED_ENV.push('ADMIN_PASS_HASH', 'RESEND_API_KEY');
if (IS_PROD && !process.env.ALLOWED_ORIGIN) {
  console.warn('  ADVERTENCIA: ALLOWED_ORIGIN no configurado — CORS permitirá cualquier origen.');
}
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`\n  ERROR: Faltan variables de entorno: ${missing.join(', ')}`);
  console.error('  Copiá .env.example → .env y completá los valores.\n');
  process.exit(1);
}

/* ---- Seguridad — HTTP headers ---- */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
      fontSrc:    ["'self'", 'fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'blob:', 'picsum.photos'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

/* ---- CORS ---- */
const allowedOrigins = IS_PROD
  ? (process.env.ALLOWED_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (!IS_PROD || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origen no permitido.'));
  },
  methods:     ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

/* ---- Rate limiting ---- */
// Login: máx 10 intentos por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API general: 200 req/min por IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

/* ---- Body parsing ---- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

/* ---- Archivos estáticos ---- */
// Solo servir carpetas públicas explícitas — NO la raíz del proyecto.
// Esto evita exponer package.json, server.js, .env, data/, api/, scripts/, etc.
app.use('/css',  express.static(path.join(__dirname, 'css')));
app.use('/js',   express.static(path.join(__dirname, 'js')));
app.use('/font', express.static(path.join(__dirname, 'font')));
app.use('/imgs', express.static(path.join(__dirname, 'imgs')));

// Archivos HTML raíz servidos explícitamente
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/proyecto.html', (_req, res) => res.sendFile(path.join(__dirname, 'proyecto.html')));

/* ---- API pública ---- */
app.post('/api/contact',     contactHandler);
app.post('/api/auth/login',  loginLimiter, login);
app.post('/api/auth/logout', logout);
app.get ('/api/auth/me',     me);

/* ---- API proyectos — pública (GET) ---- */
app.get('/api/proyectos', (_req, res) => {
  try {
    const data = require('fs').readFileSync(
      path.join(__dirname, 'data', 'proyectos.json'), 'utf-8'
    );
    res.json(JSON.parse(data));
  } catch {
    res.status(500).json({ error: 'Error al leer proyectos.' });
  }
});

/* ---- API admin — todas requieren autenticación ---- */
app.get   ('/api/admin/proyectos',                   requireAuth, admin.listar);
app.post  ('/api/admin/proyectos',                   requireAuth, admin.uploadNuevo, admin.crear);
app.put   ('/api/admin/proyectos/:id',               requireAuth, admin.editar);
app.delete('/api/admin/proyectos/:id',               requireAuth, admin.eliminar);
app.post  ('/api/admin/proyectos/:id/fotos',         requireAuth, admin.uploadFotos, admin.subirFotos);
app.delete('/api/admin/proyectos/:id/fotos/:index',  requireAuth, admin.eliminarFoto);
app.put   ('/api/admin/proyectos/:id/fotos/orden',   requireAuth, admin.reordenarFotos);
app.put   ('/api/admin/proyectos/:id/portada',       requireAuth, admin.cambiarPortada);

/* ---- SPA fallback ---- */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ---- Manejador global de errores — no filtrar stack traces ---- */
app.use((err, _req, res, _next) => {
  if (!IS_PROD) console.error(err);
  res.status(err.status || 500).json({ error: 'Error interno del servidor.' });
});

/* ---- Arrancar ---- */
app.listen(PORT, () => {
  console.log(`\n  FLEEK studio en http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin`);
  console.log(`  Modo: ${IS_PROD ? 'producción' : 'desarrollo'}\n`);
});