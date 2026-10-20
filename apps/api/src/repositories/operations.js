import { randomUUID } from "node:crypto";
import { createPool } from "../database/pool.js";
import { demoCuts } from "../data/demo-cuts.js";
import { hashPassword } from "../services/passwords.js";

const cutColumns =
  'id,name,category,description,price_cents AS "priceCents",units,available,active';
const userColumns = 'id,name,email,password_hash AS "passwordHash",role,active';
function settingsRow(row, hours) {
  return {
    ticketDisplaySeconds: row.ticket_display_seconds,
    maxReissues: row.max_reissues,
    automaticCalls: row.automatic_calls,
    timezone: row.timezone,
    hours: hours.map((h) => ({
      weekday: h.weekday,
      isClosed: h.is_closed,
      opensAt: h.opens_at?.slice(0, 5) ?? null,
      closesAt: h.closes_at?.slice(0, 5) ?? null,
    })),
  };
}
function postgresUnit(client) {
  const query = (sql, params = []) => client.query(sql, params);
  async function orders(where = "", values = []) {
    const { rows } = await query(
      `SELECT o.*,t.id AS ticket_id,t.sequential_number,t.status AS ticket_status,t.call_count,t.reissue_count,t.last_call_at FROM orders o JOIN service_tickets t ON t.order_id=o.id ${where} ORDER BY o.order_number`,
      values,
    );
    if (!rows.length) return [];
    const items = (
      await query(
        'SELECT order_id,cut_id AS "cutId",cut_name AS name,unit,quantity::float8,unit_price_cents AS "priceCents",subtotal_cents::float8 AS "subtotalCents" FROM order_items WHERE order_id=ANY($1::uuid[]) ORDER BY cut_name',
        [rows.map((o) => o.id)],
      )
    ).rows;
    return rows.map((o) => ({
      id: o.id,
      orderNumber: Number(o.order_number),
      idempotencyKey: o.idempotency_key,
      requestHash: o.request_hash,
      status: o.status,
      inPerson: o.in_person,
      assignedTo: o.assigned_to,
      createdAt: o.created_at.toISOString(),
      completedAt: o.completed_at?.toISOString() ?? null,
      ticket: {
        id: o.ticket_id,
        number: Number(o.sequential_number),
        status: o.ticket_status,
        callCount: o.call_count,
        reissueCount: o.reissue_count,
        lastCallAt: o.last_call_at?.toISOString() ?? null,
      },
      items: items
        .filter((i) => i.order_id === o.id)
        .map(({ order_id, ...i }) => i),
    }));
  }
  return {
    listCuts: async () =>
      (await query(`SELECT ${cutColumns} FROM cuts ORDER BY category,name`))
        .rows,
    saveCut: async (c) => {
      await query(
        "INSERT INTO cuts (id,name,category,description,price_cents,units,available,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET name=$2,category=$3,description=$4,price_cents=$5,units=$6,available=$7,active=$8",
        [
          c.id,
          c.name,
          c.category,
          c.description,
          c.priceCents,
          c.units,
          c.available,
          c.active,
        ],
      );
      return c;
    },
    listUsers: async () =>
      (await query(`SELECT ${userColumns} FROM users ORDER BY name`)).rows,
    getUser: async (id) =>
      (await query(`SELECT ${userColumns} FROM users WHERE id=$1`, [id]))
        .rows[0],
    findUser: async (email) =>
      (
        await query(
          `SELECT ${userColumns} FROM users WHERE lower(btrim(email))=$1`,
          [email],
        )
      ).rows[0],
    saveUser: async (u) => {
      await query(
        "INSERT INTO users (id,name,email,password_hash,role,active) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=$2,email=$3,password_hash=$4,role=$5,active=$6,updated_at=now()",
        [u.id, u.name, u.email, u.passwordHash, u.role, u.active],
      );
      return u;
    },
    getSettings: async () =>
      settingsRow(
        (await query("SELECT * FROM system_settings WHERE id=1")).rows[0],
        (await query("SELECT * FROM business_hours ORDER BY weekday")).rows,
      ),
    saveSettings: async (s, userId) => {
      await query(
        "UPDATE system_settings SET ticket_display_seconds=$1,max_reissues=$2,automatic_calls=$3,updated_by=$4,updated_at=now() WHERE id=1",
        [s.ticketDisplaySeconds, s.maxReissues, s.automaticCalls, userId],
      );
      for (const h of s.hours)
        await query(
          "INSERT INTO business_hours (weekday,is_closed,opens_at,closes_at) VALUES ($1,$2,$3,$4) ON CONFLICT(weekday) DO UPDATE SET is_closed=$2,opens_at=$3,closes_at=$4",
          [h.weekday, h.isClosed, h.opensAt, h.closesAt],
        );
      return s;
    },
    listOrders: () => orders("WHERE o.status <> 'COMPLETED'"),
    findOrder: async (key) =>
      (await orders("WHERE o.idempotency_key=$1", [key]))[0],
    getOrder: async (id) => (await orders("WHERE o.id=$1", [id]))[0],
    insertOrder: async (o) => {
      const row = (
        await query(
          "INSERT INTO orders (id,idempotency_key,request_hash,in_person) VALUES ($1,$2,$3,$4) RETURNING order_number,created_at",
          [o.id, o.idempotencyKey, o.requestHash, o.inPerson],
        )
      ).rows[0];
      for (const i of o.items)
        await query(
          "INSERT INTO order_items (order_id,cut_id,cut_name,unit,quantity,unit_price_cents) VALUES ($1,$2,$3,$4,$5,$6)",
          [o.id, i.cutId, i.name, i.unit, i.quantity, i.priceCents],
        );
      const t = (
        await query(
          "INSERT INTO service_tickets (order_id) VALUES ($1) RETURNING id,sequential_number",
          [o.id],
        )
      ).rows[0];
      return {
        ...o,
        orderNumber: Number(row.order_number),
        createdAt: row.created_at.toISOString(),
        ticket: {
          id: t.id,
          number: Number(t.sequential_number),
          status: "PENDING",
          callCount: 0,
          reissueCount: 0,
          lastCallAt: null,
        },
      };
    },
    saveOrder: async (o) => {
      await query(
        "UPDATE orders SET status=$1,assigned_to=$2,completed_at=$3 WHERE id=$4",
        [o.status, o.assignedTo, o.completedAt, o.id],
      );
      await query(
        "UPDATE service_tickets SET status=$1,call_count=$2,reissue_count=$3,last_call_at=$4 WHERE order_id=$5",
        [
          o.ticket.status,
          o.ticket.callCount,
          o.ticket.reissueCount,
          o.ticket.lastCallAt,
          o.id,
        ],
      );
      return o;
    },
    addCall: async (c) => {
      await query(
        "INSERT INTO call_history (ticket_id,called_by,type,called_at) VALUES ($1,$2,$3,$4)",
        [c.ticketId, c.calledBy, c.type, c.calledAt],
      );
    },
    calls: async () =>
      (
        await query(
          'SELECT t.sequential_number::float8 AS number,h.type,h.called_at AS "calledAt" FROM call_history h JOIN service_tickets t ON t.id=h.ticket_id ORDER BY h.called_at DESC,h.id DESC LIMIT 10',
        )
      ).rows,
  };
}
export function createPostgresOperations(databaseUrl) {
  const pool = createPool(databaseUrl);
  return {
    async transaction(run) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Serializa as mutações da fila, inclusive chamadas automáticas e reenvios.
        await client.query("SELECT pg_advisory_xact_lock(17001009)");
        const result = await run(postgresUnit(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
export async function createMemoryOperations({ seedUsers = true } = {}) {
  let state = {
    cuts: demoCuts.map((c) => ({ ...structuredClone(c), active: true })),
    users: [],
    orders: [],
    calls: [],
    next: 1,
    settings: {
      ticketDisplaySeconds: 15,
      maxReissues: 3,
      automaticCalls: false,
      timezone: "America/Sao_Paulo",
      hours: Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        isClosed: false,
        opensAt: "00:00",
        closesAt: "23:59",
      })),
    },
  };
  if (seedUsers)
    state.users.push({
      id: randomUUID(),
      name: "Gerente demonstração",
      email: "gerente@demo.local",
      passwordHash: await hashPassword("DemoAoPonto2026!"),
      role: "MANAGER",
      active: true,
    });
  let tail = Promise.resolve();
  return {
    transaction(run) {
      const job = tail.then(async () => {
        const s = structuredClone(state);
        const upsert = (rows, value) => {
          const index = rows.findIndex((r) => r.id === value.id);
          if (index < 0) rows.push(value);
          else rows[index] = value;
          return value;
        };
        const result = await run({
          listCuts: async () => s.cuts,
          saveCut: async (c) => upsert(s.cuts, c),
          listUsers: async () => s.users,
          getUser: async (id) => s.users.find((u) => u.id === id),
          findUser: async (email) =>
            s.users.find((u) => u.email.toLowerCase() === email),
          saveUser: async (u) => upsert(s.users, u),
          getSettings: async () => s.settings,
          saveSettings: async (settings) => (s.settings = settings),
          listOrders: async () =>
            s.orders.filter((o) => o.status !== "COMPLETED"),
          getOrder: async (id) => s.orders.find((o) => o.id === id),
          findOrder: async (key) =>
            s.orders.find((o) => o.idempotencyKey === key),
          insertOrder: async (o) => {
            const n = s.next++;
            const row = {
              ...o,
              orderNumber: n,
              createdAt: new Date().toISOString(),
              ticket: {
                id: randomUUID(),
                number: n,
                status: "PENDING",
                callCount: 0,
                reissueCount: 0,
                lastCallAt: null,
              },
            };
            s.orders.push(row);
            return row;
          },
          saveOrder: async (o) => upsert(s.orders, o),
          addCall: async (c) => s.calls.unshift(c),
          calls: async () => s.calls.slice(0, 10),
        });
        state = s;
        return structuredClone(result);
      });
      tail = job.catch(() => {});
      return job;
    },
    async close() {},
  };
}
