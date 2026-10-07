import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { config } from '../src/config.js';
import { demoCuts } from '../src/data/demo-cuts.js';
if (!config.databaseUrl) throw new Error('DATABASE_URL não configurada.');
const pool = new pg.Pool({ connectionString: config.databaseUrl });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  if (process.argv[2] === 'migrate') {
    await client.query(await readFile(new URL('../database/001-catalog.sql', import.meta.url), 'utf8'));
  } else if (process.argv[2] === 'seed') {
    for (const cut of demoCuts) {
      await client.query('INSERT INTO cuts (id, name, category, description, price_cents, units, available) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING', [cut.id, cut.name, cut.category, cut.description, cut.priceCents, cut.units, cut.available]);
    }
  } else { throw new Error('Comando esperado: migrate ou seed'); }
  await client.query('COMMIT');
  console.log('Banco atualizado com sucesso.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally { client.release(); await pool.end(); }
