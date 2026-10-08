import pg from "pg";
export function createPool(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");
  return new pg.Pool({ connectionString: databaseUrl });
}
