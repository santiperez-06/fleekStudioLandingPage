/**
 * FLEEK studio — scripts/initDb.js
 * Crea la tabla proyectos y migra los datos existentes de proyectos.json.
 * Ejecutar una sola vez: node scripts/initDb.js
 */

'use strict';

require('dotenv').config();

const path = require('path');
const fs   = require('fs');
const pool = require('../api/db');

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS proyectos (
        id          TEXT PRIMARY KEY,
        nombre      TEXT NOT NULL,
        ubicacion   TEXT NOT NULL,
        año         INTEGER NOT NULL,
        destacado   BOOLEAN NOT NULL DEFAULT false,
        descripcion TEXT NOT NULL DEFAULT '',
        portada     TEXT NOT NULL DEFAULT '',
        hero_img    TEXT NOT NULL DEFAULT '',
        fotos       TEXT[] NOT NULL DEFAULT '{}',
        tipologia   TEXT NOT NULL DEFAULT '',
        tamaño      TEXT NOT NULL DEFAULT '',
        proyecto    TEXT NOT NULL DEFAULT '',
        fotografia  TEXT NOT NULL DEFAULT ''
      );
    `);
    console.log('✓ Tabla proyectos creada (o ya existía).');

    const dataFile = path.join(__dirname, '..', 'data', 'proyectos.json');
    if (!fs.existsSync(dataFile)) {
      console.log('No se encontró proyectos.json, nada que migrar.');
      return;
    }

    const existing = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    let inserted = 0;

    for (const p of existing) {
      const res = await client.query(
        `INSERT INTO proyectos (id, nombre, ubicacion, año, destacado, descripcion, portada, hero_img, fotos)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id,
          p.nombre,
          p.ubicacion,
          p.año,
          p.destacado ?? false,
          p.descripcion ?? '',
          p.portada ?? '',
          p.heroImg ?? '',
          p.fotos ?? [],
        ]
      );
      if (res.rowCount > 0) inserted++;
    }

    console.log(`✓ ${inserted} proyecto(s) migrado(s) de proyectos.json.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Error en initDb:', err);
  process.exit(1);
});
