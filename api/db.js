/**
 * FLEEK studio — api/db.js
 * Conexión a PostgreSQL via DATABASE_URL (Railway).
 */

'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
