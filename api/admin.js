/**
 * FLEEK studio — api/admin.js
 * Tecnología: Node.js — multer, fs/promises, @aws-sdk/client-s3 (Cloudflare R2)
 * Scope: CRUD completo de proyectos para el panel de admin.
 */

'use strict';

const fs     = require('fs');
const fsp    = require('fs/promises');
const path   = require('path');
const multer = require('multer');
const sharp  = require('sharp');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

const DATA_FILE = path.join(__dirname, '..', 'data', 'proyectos.json');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/* ---- Helpers de persistencia ---- */

function readProyectos() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeProyectos(data) {
  await fsp.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/* ---- Multer — memoryStorage (no escribe a disco) ---- */
function makeUpload(multi = true) {
  const filter = (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error(`Formato no permitido: ${ext}`));
  };

  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: filter,
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  const middleware = multi ? upload.array('fotos', 50) : upload.single('fotos');

  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Archivo demasiado grande. Máximo 50 MB por foto.' });
      }
      return res.status(400).json({ error: err.message || 'Error al procesar archivos.' });
    });
  };
}

/* Convertir a WebP con sharp y subir a R2 */
async function uploadFilesToR2(files, id) {
  const urls = [];
  for (const f of files) {
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const key = `projects/${id}/${baseName}`;
    const buffer = await sharp(f.buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await r2.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: 'image/webp',
    }));
    urls.push(`${process.env.R2_PUBLIC_URL}/${key}`);
  }
  return urls;
}

/* Eliminar todos los objetos de R2 con un prefijo dado */
async function deleteR2Prefix(prefix) {
  const listed = await r2.send(new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET,
    Prefix: prefix,
  }));
  if (!listed.Contents || listed.Contents.length === 0) return;
  await r2.send(new DeleteObjectsCommand({
    Bucket: process.env.R2_BUCKET,
    Delete: { Objects: listed.Contents.map(o => ({ Key: o.Key })) },
  }));
}

/* Eliminar un objeto individual de R2 a partir de su URL pública */
async function deleteR2Object(url) {
  const base = process.env.R2_PUBLIC_URL + '/';
  if (!url.startsWith(base)) return;
  const key = url.slice(base.length);
  await r2.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key:    key,
  }));
}

/* ---- Validación de IDs (prevenir path traversal) ---- */
const SAFE_ID_REGEX = /^[a-z0-9][a-z0-9-]{0,80}$/;
function isValidId(id) {
  return SAFE_ID_REGEX.test(id) && !id.includes('..');
}

function isValidFotoPath(foto) {
  const base = process.env.R2_PUBLIC_URL + '/projects/';
  return typeof foto === 'string'
    && foto.startsWith(base)
    && !foto.includes('..')
    && !foto.includes('\0');
}

/* ---- Rutas ---- */

/** GET /api/admin/proyectos */
function listar(_req, res) {
  try {
    res.json(readProyectos());
  } catch {
    res.status(500).json({ error: 'Error al leer proyectos.' });
  }
}

/** POST /api/admin/proyectos */
const uploadNuevo = makeUpload(true);

async function crear(req, res) {
  const uploadedFiles = req.files || [];
  try {
    const nombre      = (req.body.nombre      || '').trim();
    const ubicacion   = (req.body.ubicacion   || '').trim();
    const anio        = (req.body.año         || req.body.anio || '').trim();
    const descripcion = (req.body.descripcion || '').trim();
    const destacado   = req.body.destacado === 'true' || req.body.destacado === true;

    if (!nombre || !ubicacion || !anio) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: nombre, ubicacion, año.',
        recibido: { nombre, ubicacion, anio },
      });
    }

    // Generar slug
    let id = nombre
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Evitar colisiones
    const proyectos = readProyectos();
    let base = id, n = 2;
    while (proyectos.find(p => p.id === id)) { id = `${base}-${n++}`; }

    const fotoPaths = uploadedFiles.length > 0
      ? await uploadFilesToR2(uploadedFiles, id)
      : [];

    const portada = fotoPaths[0] || '';

    const nuevo = {
      id,
      nombre,
      ubicacion,
      año:        parseInt(anio),
      destacado,
      descripcion,
      portada,
      heroImg:    portada,
      fotos:      fotoPaths,
    };

    proyectos.push(nuevo);
    await writeProyectos(proyectos);

    res.status(201).json(nuevo);
  } catch (err) {
    console.error('[admin.crear]', err);
    res.status(500).json({ error: 'Error al crear proyecto.' });
  }
}

/** PUT /api/admin/proyectos/:id */
async function editar(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });
    const proyectos = readProyectos();
    const idx = proyectos.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const { nombre, ubicacion, destacado, descripcion } = req.body;
    const anio = req.body.año || req.body.anio;

    if (nombre)                   proyectos[idx].nombre      = nombre.trim();
    if (ubicacion)                proyectos[idx].ubicacion   = ubicacion.trim();
    if (anio)                     proyectos[idx].año         = parseInt(anio);
    if (descripcion !== undefined) proyectos[idx].descripcion = descripcion.trim();
    if (destacado !== undefined) {
      proyectos[idx].destacado = destacado === 'true' || destacado === true;
    }

    await writeProyectos(proyectos);
    res.json(proyectos[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Error al editar proyecto.' });
  }
}

/** DELETE /api/admin/proyectos/:id */
async function eliminar(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });
    const proyectos = readProyectos();
    const idx = proyectos.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    await deleteR2Prefix(`projects/${id}/`);

    proyectos.splice(idx, 1);
    await writeProyectos(proyectos);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar proyecto.' });
  }
}

/** POST /api/admin/proyectos/:id/fotos */
const uploadFotos = makeUpload(true);

async function subirFotos(req, res) {
  const uploadedFiles = req.files || [];
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });
    const proyectos = readProyectos();
    const proyecto = proyectos.find(p => p.id === id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos.' });
    }

    const nuevasFotos = await uploadFilesToR2(uploadedFiles, id);
    proyecto.fotos.push(...nuevasFotos);

    if (!proyecto.portada) {
      proyecto.portada = proyecto.fotos[0];
      proyecto.heroImg = proyecto.fotos[0];
    }

    await writeProyectos(proyectos);
    res.json({ fotos: proyecto.fotos });
  } catch (err) {
    res.status(500).json({ error: 'Error al subir fotos.' });
  }
}

/** DELETE /api/admin/proyectos/:id/fotos/:index */
async function eliminarFoto(req, res) {
  try {
    const { id, index } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });
    const idx = parseInt(index);
    if (isNaN(idx)) return res.status(400).json({ error: 'Índice inválido.' });
    const proyectos = readProyectos();
    const proyecto = proyectos.find(p => p.id === id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (idx < 0 || idx >= proyecto.fotos.length) {
      return res.status(400).json({ error: 'Índice de foto inválido.' });
    }

    const removedSrc = proyecto.fotos[idx];
    await deleteR2Object(removedSrc);
    proyecto.fotos.splice(idx, 1);

    if (proyecto.portada === removedSrc) {
      proyecto.portada = proyecto.fotos[0] || '';
      proyecto.heroImg = proyecto.portada;
    }

    await writeProyectos(proyectos);
    res.json({ fotos: proyecto.fotos });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar foto.' });
  }
}

/** PUT /api/admin/proyectos/:id/fotos/orden */
async function reordenarFotos(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });
    const { fotos } = req.body;
    const proyectos = readProyectos();
    const proyecto = proyectos.find(p => p.id === id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!Array.isArray(fotos)) return res.status(400).json({ error: 'fotos debe ser un array.' });

    // Validar que solo se reordenen fotos ya existentes en el proyecto
    const existentes = new Set(proyecto.fotos);
    if (!fotos.every(f => isValidFotoPath(f) && existentes.has(f))) {
      return res.status(400).json({ error: 'Lista de fotos contiene rutas inválidas.' });
    }

    proyecto.fotos = fotos;
    await writeProyectos(proyectos);
    res.json({ fotos: proyecto.fotos });
  } catch (err) {
    res.status(500).json({ error: 'Error al reordenar fotos.' });
  }
}

/** PUT /api/admin/proyectos/:id/portada */
async function cambiarPortada(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });
    const { portada, heroImg } = req.body;
    const proyectos = readProyectos();
    const proyecto = proyectos.find(p => p.id === id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    // Validar que los paths pertenezcan a las fotos del proyecto
    if (portada && (!isValidFotoPath(portada) || !proyecto.fotos.includes(portada))) {
      return res.status(400).json({ error: 'Ruta de portada inválida.' });
    }
    if (heroImg && (!isValidFotoPath(heroImg) || !proyecto.fotos.includes(heroImg))) {
      return res.status(400).json({ error: 'Ruta de heroImg inválida.' });
    }

    if (portada) proyecto.portada = portada;
    if (heroImg) proyecto.heroImg = heroImg;

    await writeProyectos(proyectos);
    res.json({ portada: proyecto.portada, heroImg: proyecto.heroImg });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar portada.' });
  }
}

module.exports = {
  listar,
  uploadNuevo, crear,
  editar,
  eliminar,
  uploadFotos, subirFotos,
  eliminarFoto,
  reordenarFotos,
  cambiarPortada,
};