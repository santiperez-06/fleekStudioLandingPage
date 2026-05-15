/**
 * ESTUDIO — server.js
 * Tecnología: Node.js + Express
 * Scope: Servidor de desarrollo que sirve los archivos
 *        estáticos del frontend + la API de contacto.
 *
 * Para producción se recomienda usar Vercel, Netlify o un
 * servidor Nginx que sirva /public directamente y haga
 * proxy de /api a este proceso Node.
 *
 * USO:
 *   npm install
 *   npm start       → producción
 *   npm run dev     → con nodemon (hot reload)
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const contactHandler = require('./api/contact');

const app  = express();
const PORT = process.env.PORT || 3000;

/* --- Middleware --- */
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

/* --- Archivos estáticos del frontend --- */
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html',
}));

/* --- API Routes --- */
app.post('/api/contact', contactHandler);

/* --- 404 → devuelve index.html (SPA fallback) --- */
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* --- Iniciar servidor --- */
app.listen(PORT, () => {
  console.log(`\n  Estudio.Arq corriendo en http://localhost:${PORT}\n`);
});