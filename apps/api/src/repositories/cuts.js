import pg from 'pg';
import { demoCuts } from '../data/demo-cuts.js';
export function createCutRepository(config) {
  if (config.catalogSource === 'demo') {
    console.warn('Modo demonstração: catálogo fictício, sem persistência de pedidos.');
    return { async list() { return structuredClone(demoCuts); }, async close() {} };
  }
  if (config.catalogSource !== 'postgres' || !config.databaseUrl) {
    throw new Error('Configure DATABASE_URL ou escolha CATALOG_SOURCE=demo para demonstração local.');
  }
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  return {
    async list() {
      const { rows } = await pool.query('SELECT id, name, category, description, price_cents AS "priceCents", units, available FROM cuts WHERE active = true ORDER BY category, name');
      return rows;
    },
    async close() { await pool.end(); },
  };
}
