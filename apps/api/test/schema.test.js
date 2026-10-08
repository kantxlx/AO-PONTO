import test from "node:test";
import assert from "node:assert/strict";
import { createPool } from "../src/database/pool.js";

test(
  "PostgreSQL: integridade de usuários, pedidos, itens, senhas e horários",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const pool = createPool(process.env.TEST_DATABASE_URL);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      async function rejects(sql, parameters, code) {
        await client.query("SAVEPOINT invalid_input");
        await assert.rejects(
          client.query(sql, parameters),
          (error) => error.code === code,
        );
        await client.query("ROLLBACK TO SAVEPOINT invalid_input");
      }
      const migration = await client.query(
        "SELECT name FROM schema_migrations ORDER BY name",
      );
      assert.deepEqual(
        migration.rows.map((row) => row.name),
        ["001-catalog.sql", "002-domain.sql"],
      );
      const user = await client.query(
        "INSERT INTO users (name,email,password_hash,role) VALUES ('Teste','schema-test@example.test',$1,'MANAGER') RETURNING id",
        ["x".repeat(60)],
      );
      await rejects(
        "INSERT INTO users (name,email,password_hash,role) VALUES ('Outro','SCHEMA-TEST@example.test',$1,'MANAGER')",
        ["x".repeat(60)],
        "23505",
      );
      const order = await client.query(
        "INSERT INTO orders (idempotency_key,assigned_to) VALUES (gen_random_uuid(),$1) RETURNING id,idempotency_key",
        [user.rows[0].id],
      );
      const orderId = order.rows[0].id;
      await rejects(
        "INSERT INTO orders (idempotency_key) VALUES ($1)",
        [order.rows[0].idempotency_key],
        "23505",
      );
      await rejects(
        "UPDATE orders SET status='COMPLETED' WHERE id=$1",
        [orderId],
        "23514",
      );
      const item = await client.query(
        "INSERT INTO order_items (order_id,cut_id,cut_name,unit,quantity,unit_price_cents) VALUES ($1,'picanha','Picanha','kg',0.500,7990) RETURNING subtotal_cents",
        [orderId],
      );
      assert.equal(item.rows[0].subtotal_cents, "3995");
      await rejects(
        "INSERT INTO order_items (order_id,cut_id,cut_name,unit,quantity,unit_price_cents) VALUES ($1,'frango-inteiro','Frango','un',1.5,3490)",
        [orderId],
        "23514",
      );
      await rejects(
        "INSERT INTO order_items (order_id,cut_id,cut_name,unit,quantity,unit_price_cents) VALUES ($1,'alcatra','Alcatra','kg',0,4990)",
        [orderId],
        "23514",
      );
      await rejects("DELETE FROM cuts WHERE id='picanha'", [], "23503");
      const ticket = await client.query(
        "INSERT INTO service_tickets (order_id) VALUES ($1) RETURNING id,sequential_number",
        [orderId],
      );
      assert.ok(Number(ticket.rows[0].sequential_number) > 0);
      await rejects(
        "INSERT INTO service_tickets (order_id) VALUES ($1)",
        [orderId],
        "23505",
      );
      await client.query(
        "INSERT INTO call_history (ticket_id,called_by,type) VALUES ($1,$2,'MANUAL')",
        [ticket.rows[0].id, user.rows[0].id],
      );
      await rejects(
        "INSERT INTO business_hours (weekday,opens_at,closes_at) VALUES (1,'18:00','08:00')",
        [],
        "23514",
      );
      await rejects("INSERT INTO system_settings (id) VALUES (2)", [], "23514");
    } finally {
      await client.query("ROLLBACK");
      client.release();
      await pool.end();
    }
  },
);
