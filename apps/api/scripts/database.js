import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { config } from "../src/config.js";
import { createPool } from "../src/database/pool.js";
import { demoCuts } from "../src/data/demo-cuts.js";

const action = process.argv[2];
if (!["migrate", "seed"].includes(action))
  throw new Error("Comando esperado: migrate ou seed");
const pool = createPool(config.databaseUrl);
let client;
try {
  client = await pool.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(17001008)");
  if (action === "migrate") {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const directory = new URL("../database/", import.meta.url);
    const files = (await readdir(directory))
      .filter((name) => /^\d+[-\w]*\.sql$/.test(name))
      .sort();
    for (const name of files) {
      const sql = (await readFile(new URL(name, directory), "utf8"))
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const { rows } = await client.query(
        "SELECT checksum FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (rows.length) {
        if (rows[0].checksum !== checksum)
          throw new Error(
            `Migração ${name} foi alterada após aplicação. Crie uma nova migração.`,
          );
        console.log(`Já aplicada: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name,checksum) VALUES ($1,$2)",
        [name, checksum],
      );
      console.log(`Aplicada: ${name}`);
    }
  } else {
    for (const cut of demoCuts) {
      await client.query(
        "INSERT INTO cuts (id,name,category,description,price_cents,units,available) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
        [
          cut.id,
          cut.name,
          cut.category,
          cut.description,
          cut.priceCents,
          cut.units,
          cut.available,
        ],
      );
    }
    console.log(
      "Catálogo de desenvolvimento carregado sem sobrescrever dados existentes.",
    );
  }
  await client.query("COMMIT");
  console.log("Banco atualizado com sucesso.");
} catch (error) {
  if (client) await client.query("ROLLBACK");
  console.error(`Falha ao atualizar banco: ${error.message}`);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
