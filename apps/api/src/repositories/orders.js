import pg from "pg";

export function createOrderRepository(config) {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required to use the order repository.");
  }

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
  });

  return {
    async register(order, serviceTicket) {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Order persistence will be implemented
        // after the UC03 database schema is defined.

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}