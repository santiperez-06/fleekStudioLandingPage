/**
 * FLEEK studio — scripts/setup.js
 * Genera el hash de la contraseña para el .env
 * Uso: node scripts/setup.js
 */
'use strict';
const bcrypt   = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Usuario admin: ', (user) => {
  rl.question('Contraseña: ', async (pass) => {
    const hash = await bcrypt.hash(pass, 12);
    console.log('\n--- Agregá esto a tu .env ---');
    console.log(`ADMIN_USER=${user}`);
    console.log(`ADMIN_PASS_HASH=${hash}`);
    console.log('-----------------------------\n');
    rl.close();
  });
});