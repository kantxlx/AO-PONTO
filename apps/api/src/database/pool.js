import pg from "pg";
export function createPool(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");
  return new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 30000,
    statement_timeout: 2500,
  });
}
