import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import {
  createMemoryOperations,
  createPostgresOperations,
} from "../src/repositories/operations.js";
import { createOperationsService } from "../src/services/operationsService.js";
import { hashPassword } from "../src/services/passwords.js";
const payload = () => ({
  idempotencyKey: randomUUID(),
  inPerson: true,
  items: [{ cutId: "picanha", quantity: "0,500", unit: "kg" }],
});
async function fixture() {
  const store = await createMemoryOperations();
  let date = new Date("2026-10-20T15:00:00Z");
  const service = createOperationsService(store, { now: () => date });
  const manager = await service.login("gerente@demo.local", "DemoAoPonto2026!");
  return {
    store,
    service,
    manager,
    setDate: (value) => (date = new Date(value)),
  };
}
test("UC03/05: preço do servidor, transação, idempotência concorrente e escolha presencial", async () => {
  const { store, service } = await fixture();
  const body = payload();
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      service.register({ ...body, priceCents: 1 }),
    ),
  );
  assert.equal(new Set(results.map((r) => r.order.id)).size, 1);
  assert.equal(results.filter((r) => !r.replayed).length, 1);
  assert.equal(results[0].order.totalCents, 3995);
  assert.equal(results[0].order.inPerson, true);
  await assert.rejects(
    service.register({ ...body, inPerson: false }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    service.register({
      ...payload(),
      items: [{ cutId: "frango-inteiro", quantity: 1, unit: "un" }],
    }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    service.register({
      ...payload(),
      items: [{ cutId: "picanha", quantity: 0, unit: "kg" }],
    }),
    (e) => e.status === 400,
  );
  await assert.rejects(
    service.register({
      ...payload(),
      items: [
        { cutId: "picanha", quantity: 1, unit: "kg" },
        { cutId: "ausente", quantity: 1, unit: "kg" },
      ],
    }),
  );
  assert.equal((await store.transaction((tx) => tx.listOrders())).length, 1);
});
test("UC04/06/07/08/09: FIFO, agrupamento, disputa de chamadas, reemissão e conclusão", async () => {
  const { service, manager } = await fixture();
  const a = (await service.register(payload())).order,
    b = (await service.register(payload())).order;
  const d = await service.dashboard(manager);
  assert.equal(d.groups[0].quantity, 1);
  assert.deepEqual(d.groups[0].tickets, [a.ticket.number, b.ticket.number]);
  const calls = await Promise.all([
    service.next(manager),
    service.next(manager),
  ]);
  assert.deepEqual(
    calls.map((o) => o.id),
    [a.id, b.id],
  );
  await assert.rejects(service.next(manager), (e) => e.status === 409);
  for (let i = 0; i < 3; i++) await service.reissue(manager, a.id);
  await assert.rejects(service.reissue(manager, a.id), (e) => e.status === 409);
  assert.equal((await service.display()).history.length, 5);
  const done = await service.complete(manager, a.id);
  assert.equal(done.ticket.status, "FINISHED");
  assert.equal((await service.complete(manager, a.id)).status, "COMPLETED");
  assert.equal((await service.dashboard(manager)).groups[0].quantity, 0.5);
  const publicDisplay = await service.display();
  assert.equal(JSON.stringify(publicDisplay).includes("picanha"), false);
});
test("UC10–14: perfis, catálogo histórico, usuário desativado, último gerente e expediente", async () => {
  const { service, manager } = await fixture();
  await assert.rejects(
    service.login("gerente@demo.local", "errada"),
    (e) => e.status === 401,
  );
  const employee = await service.saveUser(manager, null, {
    name: "Balcão",
    email: "balcao@example.test",
    password: "SenhaDoBalcao123!",
    role: "EMPLOYEE",
    active: true,
  });
  assert.equal("passwordHash" in employee, false);
  await assert.rejects(service.admin(employee), (e) => e.status === 403);
  await assert.rejects(
    service.saveUser(manager, manager.id, { ...manager, active: false }),
    (e) => e.status === 409,
  );
  const a = (await service.register(payload())).order;
  const catalog = await service.admin(manager),
    cut = catalog.cuts.find((c) => c.id === "picanha");
  await service.saveCut(manager, cut.id, {
    ...cut,
    name: "Outro nome",
    priceCents: 1,
  });
  await service.removeCut(manager, cut.id);
  assert.equal(
    (await service.dashboard(manager)).orders[0].items[0].priceCents,
    7990,
  );
  assert.equal(
    (await service.dashboard(manager)).orders[0].items[0].name,
    "Picanha",
  );
  await assert.rejects(service.register(payload()), (e) => e.status === 409);
  const s = catalog.settings;
  await service.saveSettings(manager, {
    ...s,
    hours: s.hours.map((h) => ({
      ...h,
      isClosed: true,
      opensAt: null,
      closesAt: null,
    })),
  });
  assert.equal((await service.status()).open, false);
  await assert.rejects(
    service.register({
      ...payload(),
      items: [{ cutId: "alcatra", unit: "kg", quantity: 1 }],
    }),
    (e) => e.status === 409,
  );
  await service.saveUser(manager, employee.id, { ...employee, active: false });
  assert.equal(await service.user(employee.id), null);
  assert.ok(a.id);
});
test("Chamada automática: intervalo, repetição limitada, expiração e próxima senha", async () => {
  const { service, manager, setDate } = await fixture();
  let s = (await service.admin(manager)).settings;
  await service.saveSettings(manager, {
    ...s,
    automaticCalls: true,
    ticketDisplaySeconds: 2,
    maxReissues: 1,
  });
  await service.register(payload());
  await service.register(payload());
  await service.tick();
  assert.equal((await service.display()).current[0].number, 1);
  await service.tick();
  assert.equal((await service.display()).history.length, 1);
  setDate("2026-10-20T15:00:03Z");
  await service.tick();
  assert.equal((await service.display()).history[0].type, "REISSUE");
  setDate("2026-10-20T15:00:06Z");
  await service.tick();
  assert.equal((await service.display()).current.length, 0);
  await service.tick();
  assert.equal((await service.display()).current[0].number, 2);
  const expired = (await service.dashboard(manager)).orders.find(
    (o) => o.ticket.status === "EXPIRED",
  );
  assert.ok(expired);
  await service.restore(manager, expired.id);
  assert.equal((await service.track(expired.id)).ticketStatus, "PENDING");
  assert.equal((await service.track(expired.id)).number, 1);
});
test("HTTP: login/cookie, origem, JSON, acesso anônimo e permissão de funcionário", async () => {
  const { store, service, manager } = await fixture();
  await service.saveUser(manager, null, {
    name: "Funcionário",
    email: "func@example.test",
    password: "SenhaDoBalcao123!",
    role: "EMPLOYEE",
    active: true,
  });
  const server = createApp(
    { list: () => store.transaction((tx) => tx.listCuts()) },
    { operations: service, demo: true },
  ).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(url + "/api/admin")).status, 401);
    assert.equal(
      (
        await fetch(url + "/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://outro.test",
          },
          body: JSON.stringify(payload()),
        })
      ).status,
      403,
    );
    const login = await fetch(url + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "func@example.test",
        password: "SenhaDoBalcao123!",
      }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    const headers = {
      Cookie: cookie.split(";")[0],
      "Content-Type": "application/json",
    };
    assert.equal((await fetch(url + "/api/admin", { headers })).status, 403);
    assert.equal(
      (await fetch(url + "/api/operations", { headers })).status,
      200,
    );
    const o = await fetch(url + "/api/orders", {
      method: "POST",
      headers,
      body: JSON.stringify(payload()),
    });
    assert.equal(o.status, 201);
    const registered = (await o.json()).order;
    const tracked = await fetch(`${url}/api/orders/${registered.id}/status`);
    assert.equal(tracked.status, 200);
    const tracking = await tracked.json();
    assert.equal(tracking.number, registered.ticket.number);
    assert.equal("items" in tracking, false);
    const abort = new AbortController();
    const stream = await fetch(url + "/api/events", { signal: abort.signal });
    assert.match(stream.headers.get("content-type"), /text\/event-stream/);
    const chunk = await stream.body.getReader().read();
    assert.match(new TextDecoder().decode(chunk.value), /"waiting"/);
    abort.abort();
    assert.equal(
      (await fetch(url + "/api/orders", { method: "POST", headers, body: "{" }))
        .status,
      400,
    );
    await fetch(url + "/api/auth/logout", {
      method: "POST",
      headers,
      body: "{}",
    });
    assert.equal(
      (await fetch(url + "/api/operations", { headers })).status,
      401,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test(
  "PostgreSQL: pedido atômico, reenvio concorrente, chamada e histórico persistidos",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const store = createPostgresOperations(process.env.TEST_DATABASE_URL),
      service = createOperationsService(store);
    const id = randomUUID(),
      email = `ops-${id}@example.test`,
      keys = [],
      orderIds = [];
    try {
      const passwordHash = await hashPassword("SenhaIntegration123!");
      await store.transaction((tx) =>
        tx.saveUser({
          id,
          name: "Teste integração",
          email,
          passwordHash,
          role: "MANAGER",
          active: true,
        }),
      );
      const manager = await service.login(email, "SenhaIntegration123!");
      const admin = await service.admin(manager);
      await service.saveSettings(manager, admin.settings);
      await service.saveCut(
        manager,
        "picanha",
        admin.cuts.find((c) => c.id === "picanha"),
      );
      const body = payload();
      keys.push(body.idempotencyKey);
      const result = await Promise.all([
        service.register(body),
        service.register(body),
      ]);
      orderIds.push(result[0].order.id);
      assert.equal(result[0].order.id, result[1].order.id);
      assert.equal(result[0].order.totalCents, 3995);
      const called = await service.next(manager);
      assert.ok(called.ticket.callCount > 0);
      await service.reissue(manager, called.id);
      await service.complete(manager, called.id);
      const persisted = await store.transaction((tx) => tx.getOrder(called.id));
      assert.equal(persisted.status, "COMPLETED");
      assert.equal(persisted.ticket.status, "FINISHED");
      assert.ok(
        (await service.display()).history.some(
          (c) => c.number === called.ticket.number,
        ),
      );
    } finally {
      await store.close();
      const { createPool } = await import("../src/database/pool.js");
      const pool = createPool(process.env.TEST_DATABASE_URL);
      try {
        await pool.query(
          "UPDATE system_settings SET updated_by=NULL WHERE updated_by=$1",
          [id],
        );
        await pool.query("DELETE FROM call_history WHERE called_by=$1", [id]);
        await pool.query(
          "DELETE FROM service_tickets WHERE order_id=ANY($1::uuid[])",
          [orderIds],
        );
        await pool.query(
          "DELETE FROM order_items WHERE order_id=ANY($1::uuid[])",
          [orderIds],
        );
        await pool.query(
          "DELETE FROM orders WHERE idempotency_key=ANY($1::uuid[])",
          [keys],
        );
        await pool.query("DELETE FROM users WHERE id=$1", [id]);
      } finally {
        await pool.end();
      }
    }
  },
);

test("Pedido: subtotal de 1,005 kg coincide com arredondamento decimal PostgreSQL", async () => {
  const { service, manager } = await fixture();
  const cut = await service.saveCut(manager, null, {
    name: "Corte centavos",
    category: "Bovinos",
    description: "",
    priceCents: 100,
    units: ["kg"],
    available: true,
  });
  const result = await service.register({
    ...payload(),
    items: [{ cutId: cut.id, quantity: 1.005, unit: "kg" }],
  });
  assert.equal(result.order.totalCents, 101);
});
