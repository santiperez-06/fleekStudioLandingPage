/**
 * FLEEK studio — api/admin.js
 * Tecnología: Node.js — multer, sharp, @aws-sdk/client-s3 (R2), pg (PostgreSQL)
 * Scope: CRUD completo de proyectos para el panel de admin.
 */

'use strict';

const path   = require('path');
const multer = require('multer');
const sharp  = require('sharp');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const pool   = require('./db');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/* ---- Helpers de persistencia (DB) ---- */

async function getProyectos() {
  const { rows } = await pool.query('SELECT * FROM proyectos ORDER BY año DESC, nombre ASC');
  return rows.map(dbToProject);
}

async function getProyecto(id) {
  const { rows } = await pool.query('SELECT * FROM proyectos WHERE id = $1', [id]);
  return rows.length ? dbToProject(rows[0]) : null;
}

// DB usa snake_case para hero_img; la API expone heroImg
function dbToProject(row) {
  return {
    id:          row.id,
    nombre:      row.nombre,
    ubicacion:   row.ubicacion,
    año:         row.año,
    destacado:   row.destacado,
    descripcion: row.descripcion,
    portada:     row.portada,
    heroImg:     row.hero_img,
    fotos:       row.fotos,
    tipologia:   row.tipologia,
    tamaño:      row.tamaño,
    proyecto:    row.proyecto,
    fotografia:  row.fotografia,
  };
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
async function listar(_req, res) {
  try {
    res.json(await getProyectos());
  } catch (err) {
    console.error('[admin.listar]', err);
    res.status(500).json({ error: 'Error al leer proyectos.' });
  }
}

/** POST /api/admin/proyectos */
const uploadNuevo = makeUpload(true);

async function crear(req, res) {
  try {
    const nombre      = (req.body.nombre      || '').trim();
    const ubicacion   = (req.body.ubicacion   || '').trim();
    const anio        = (req.body.año         || req.body.anio || '').trim();
    const descripcion = (req.body.descripcion || '').trim();
    const destacado   = req.body.destacado === 'true' || req.body.destacado === true;
    const tipologia   = (req.body.tipologia   || '').trim();
    const tamaño      = (req.body.tamaño      || '').trim();
    const proyecto    = (req.body.proyecto    || '').trim();
    const fotografia  = (req.body.fotografia  || '').trim();

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
    const existing = await getProyectos();
    let base = id, n = 2;
    while (existing.find(p => p.id === id)) { id = `${base}-${n++}`; }

    const uploadedFiles = req.files || [];
    const fotoPaths = uploadedFiles.length > 0
      ? await uploadFilesToR2(uploadedFiles, id)
      : [];

    const portada = fotoPaths[0] || '';

    await pool.query(
      `INSERT INTO proyectos (id, nombre, ubicacion, año, destacado, descripcion, portada, hero_img, fotos, tipologia, tamaño, proyecto, fotografia)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, nombre, ubicacion, parseInt(anio), destacado, descripcion, portada, portada, fotoPaths, tipologia, tamaño, proyecto, fotografia]
    );

    res.status(201).json(await getProyecto(id));
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

    const proyecto = await getProyecto(id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const nombre      = req.body.nombre      !== undefined ? req.body.nombre.trim()      : proyecto.nombre;
    const ubicacion   = req.body.ubicacion   !== undefined ? req.body.ubicacion.trim()   : proyecto.ubicacion;
    const anio        = req.body.año || req.body.anio      ? parseInt(req.body.año || req.body.anio) : proyecto.año;
    const descripcion = req.body.descripcion !== undefined ? req.body.descripcion.trim() : proyecto.descripcion;
    const destacado   = req.body.destacado   !== undefined ? (req.body.destacado === 'true' || req.body.destacado === true) : proyecto.destacado;
    const tipologia   = req.body.tipologia   !== undefined ? req.body.tipologia.trim()   : proyecto.tipologia;
    const tamaño      = req.body.tamaño      !== undefined ? req.body.tamaño.trim()      : proyecto.tamaño;
    const proyectoVal = req.body.proyecto    !== undefined ? req.body.proyecto.trim()    : proyecto.proyecto;
    const fotografia  = req.body.fotografia  !== undefined ? req.body.fotografia.trim()  : proyecto.fotografia;

    await pool.query(
      `UPDATE proyectos SET nombre=$1, ubicacion=$2, año=$3, descripcion=$4, destacado=$5,
       tipologia=$6, tamaño=$7, proyecto=$8, fotografia=$9 WHERE id=$10`,
      [nombre, ubicacion, anio, descripcion, destacado, tipologia, tamaño, proyectoVal, fotografia, id]
    );

    res.json(await getProyecto(id));
  } catch (err) {
    console.error('[admin.editar]', err);
    res.status(500).json({ error: 'Error al editar proyecto.' });
  }
}

/** DELETE /api/admin/proyectos/:id */
async function eliminar(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });

    const proyecto = await getProyecto(id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    await deleteR2Prefix(`projects/${id}/`);
    await pool.query('DELETE FROM proyectos WHERE id = $1', [id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[admin.eliminar]', err);
    res.status(500).json({ error: 'Error al eliminar proyecto.' });
  }
}

/** POST /api/admin/proyectos/:id/fotos */
const uploadFotos = makeUpload(true);

async function subirFotos(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });

    const proyecto = await getProyecto(id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const uploadedFiles = req.files || [];
    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos.' });
    }

    const nuevasFotos = await uploadFilesToR2(uploadedFiles, id);
    const fotos = [...proyecto.fotos, ...nuevasFotos];
    const portada = proyecto.portada || fotos[0] || '';
    const heroImg = proyecto.heroImg || fotos[0] || '';

    await pool.query(
      'UPDATE proyectos SET fotos=$1, portada=$2, hero_img=$3 WHERE id=$4',
      [fotos, portada, heroImg, id]
    );

    res.json({ fotos });
  } catch (err) {
    console.error('[admin.subirFotos]', err);
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

    const proyecto = await getProyecto(id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (idx < 0 || idx >= proyecto.fotos.length) {
      return res.status(400).json({ error: 'Índice de foto inválido.' });
    }

    const removedSrc = proyecto.fotos[idx];
    await deleteR2Object(removedSrc);

    const fotos = [...proyecto.fotos];
    fotos.splice(idx, 1);

    let portada = proyecto.portada;
    let heroImg = proyecto.heroImg;
    if (portada === removedSrc) portada = fotos[0] || '';
    if (heroImg === removedSrc) heroImg = fotos[0] || '';

    await pool.query(
      'UPDATE proyectos SET fotos=$1, portada=$2, hero_img=$3 WHERE id=$4',
      [fotos, portada, heroImg, id]
    );

    res.json({ fotos });
  } catch (err) {
    console.error('[admin.eliminarFoto]', err);
    res.status(500).json({ error: 'Error al eliminar foto.' });
  }
}

/** PUT /api/admin/proyectos/:id/fotos/orden */
async function reordenarFotos(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });

    const proyecto = await getProyecto(id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const { fotos } = req.body;
    if (!Array.isArray(fotos)) return res.status(400).json({ error: 'fotos debe ser un array.' });

    const existentes = new Set(proyecto.fotos);
    if (!fotos.every(f => isValidFotoPath(f) && existentes.has(f))) {
      return res.status(400).json({ error: 'Lista de fotos contiene rutas inválidas.' });
    }

    await pool.query('UPDATE proyectos SET fotos=$1 WHERE id=$2', [fotos, id]);

    res.json({ fotos });
  } catch (err) {
    console.error('[admin.reordenarFotos]', err);
    res.status(500).json({ error: 'Error al reordenar fotos.' });
  }
}

/** PUT /api/admin/proyectos/:id/portada */
async function cambiarPortada(req, res) {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: 'ID inválido.' });

    const proyecto = await getProyecto(id);
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const { portada, heroImg } = req.body;

    if (portada && (!isValidFotoPath(portada) || !proyecto.fotos.includes(portada))) {
      return res.status(400).json({ error: 'Ruta de portada inválida.' });
    }
    if (heroImg && (!isValidFotoPath(heroImg) || !proyecto.fotos.includes(heroImg))) {
      return res.status(400).json({ error: 'Ruta de heroImg inválida.' });
    }

    const newPortada = portada || proyecto.portada;
    const newHeroImg = heroImg || proyecto.heroImg;

    await pool.query(
      'UPDATE proyectos SET portada=$1, hero_img=$2 WHERE id=$3',
      [newPortada, newHeroImg, id]
    );

    res.json({ portada: newPortada, heroImg: newHeroImg });
  } catch (err) {
    console.error('[admin.cambiarPortada]', err);
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
