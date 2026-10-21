import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createMemoryOperations } from "../src/repositories/operations.js";
import { createOperationsService } from "../src/services/operationsService.js";

const payload = () => ({
  idempotencyKey: randomUUID(),
  inPerson: true,
  items: [{ cutId: "picanha", quantity: "0,500", unit: "kg" }],
});

async function fixture() {
  const store = await createMemoryOperations();
  const service = createOperationsService(store, {
    now: () => new Date("2026-10-20T15:00:00Z"),
  });
  const manager = await service.login("gerente@demo.local", "DemoAoPonto2026!");
  return { store, service, manager };
}

async function withServer(service, store, run) {
  const server = createApp(
    { list: () => store.transaction((tx) => tx.listCuts()) },
    { operations: service, demo: true },
  ).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("Pedido: payload inválido é rejeitado sem gravar pedido", async () => {
  const { store, service } = await fixture();
  const cases = [
    { ...payload(), idempotencyKey: "nao-e-uuid" },
    { ...payload(), inPerson: "sim" },
    { ...payload(), items: [] },
    {
      ...payload(),
      items: Array.from({ length: 51 }, () => ({
        cutId: "picanha",
        quantity: 1,
        unit: "kg",
      })),
    },
    {
      ...payload(),
      items: [
        { cutId: "picanha", quantity: 1, unit: "kg" },
        { cutId: "picanha", quantity: 2, unit: "kg" },
      ],
    },
    {
      ...payload(),
      items: [{ cutId: "picanha", quantity: 1, unit: "g" }],
    },
    {
      ...payload(),
      items: [{ cutId: "picanha", quantity: "0", unit: "kg" }],
    },
    {
      ...payload(),
      items: [{ cutId: "picanha", quantity: "1,0001", unit: "kg" }],
    },
    {
      ...payload(),
      items: [{ cutId: "picanha", quantity: 1, unit: "un" }],
    },
    {
      ...payload(),
      items: [{ cutId: "ausente", quantity: 1, unit: "kg" }],
    },
  ];

  for (const [index, body] of cases.entries()) {
    await assert.rejects(
      service.register(body),
      (error) => [400, 409].includes(error.status),
      `caso inválido ${index + 1}`,
    );
  }
  assert.equal(
    await store.transaction((tx) => tx.listOrders().then((o) => o.length)),
    0,
  );
});

test("Pedido: mesma chave recupera o pedido e conflito de conteúdo é bloqueado", async () => {
  const { service } = await fixture();
  const body = payload();
  const first = await service.register(body);
  const replay = await service.register({
    ...body,
    items: [{ cutId: "picanha", quantity: 0.5, unit: "kg" }],
  });
  assert.equal(replay.replayed, true);
  assert.equal(replay.order.id, first.order.id);
  await assert.rejects(
    service.register({
      ...body,
      items: [{ cutId: "alcatra", quantity: 1, unit: "kg" }],
    }),
    (error) => error.status === 409,
  );
});

test("Atendimento: transições inválidas e acompanhamento não expõem pedido", async () => {
  const { service, manager } = await fixture();
  const order = (await service.register(payload())).order;

  await assert.rejects(
    service.complete(manager, order.id),
    (error) => error.status === 409,
  );
  await assert.rejects(
    service.reissue(manager, order.id),
    (error) => error.status === 409,
  );
  await assert.rejects(
    service.restore(manager, order.id),
    (error) => error.status === 409,
  );
  await assert.rejects(
    service.track("nao-e-uuid"),
    (error) => error.status === 400,
  );
  await assert.rejects(
    service.track(randomUUID()),
    (error) => error.status === 404,
  );

  const called = await service.next(manager);
  assert.equal(called.ticket.status, "CALLED");
  const done = await service.complete(manager, called.id);
  assert.equal(done.status, "COMPLETED");
  assert.equal(done.ticket.status, "FINISHED");
  assert.equal(
    (await service.complete(manager, called.id)).status,
    "COMPLETED",
  );
  await assert.rejects(
    service.reissue(manager, called.id),
    (error) => error.status === 409,
  );
  await assert.rejects(
    service.restore(manager, called.id),
    (error) => error.status === 409,
  );
  const tracked = await service.track(called.id);
  assert.equal(tracked.status, "COMPLETED");
  assert.equal(tracked.ticketStatus, "FINISHED");
  assert.equal("items" in tracked, false);
});

test("Administração: valida usuários, cortes e configurações antes de salvar", async () => {
  const { service, manager } = await fixture();

  const user = {
    name: "Balcão",
    email: "balcao@example.test",
    password: "SenhaDoBalcao123!",
    role: "EMPLOYEE",
    active: true,
  };
  await assert.rejects(
    service.saveUser(manager, null, { ...user, email: "gerente@demo.local" }),
    (error) => error.status === 409,
  );
  await assert.rejects(
    service.saveUser(manager, null, { ...user, password: "curta" }),
    (error) => error.status === 400,
  );
  await assert.rejects(
    service.saveUser(manager, null, { ...user, role: "OWNER" }),
    (error) => error.status === 400,
  );

  const cut = {
    name: "Corte de teste",
    category: "Bovinos",
    description: "",
    priceCents: 1000,
    units: ["kg"],
    available: true,
  };
  await assert.rejects(
    service.saveCut(manager, randomUUID(), cut),
    (error) => error.status === 404,
  );
  for (const invalid of [
    { ...cut, units: [] },
    { ...cut, units: ["kg", "kg"] },
    { ...cut, priceCents: -1 },
    { ...cut, available: "sim" },
    { ...cut, name: " " },
    { ...cut, description: "x".repeat(1001) },
  ]) {
    await assert.rejects(
      service.saveCut(manager, null, invalid),
      (error) => error.status === 400,
    );
  }

  const settings = (await service.admin(manager)).settings;
  for (const invalid of [
    { ...settings, hours: settings.hours.slice(0, 6) },
    {
      ...settings,
      hours: [...settings.hours.slice(0, 6), settings.hours[0]],
    },
    {
      ...settings,
      hours: settings.hours.map((hour, index) =>
        index
          ? hour
          : { ...hour, isClosed: false, opensAt: "18:00", closesAt: "08:00" },
      ),
    },
    { ...settings, automaticCalls: "sim" },
    { ...settings, ticketDisplaySeconds: 0 },
    { ...settings, maxReissues: 101 },
  ]) {
    await assert.rejects(
      service.saveSettings(manager, invalid),
      (error) => error.status === 400,
    );
  }
});

test("HTTP: JSON, origem, rota inexistente e limite de tentativas de login", async () => {
  const { store, service } = await fixture();

  await withServer(service, store, async (url) => {
    assert.equal((await fetch(`${url}/api/ready`)).status, 200);
    assert.equal((await fetch(`${url}/api/nao-existe`)).status, 404);

    const invalidJson = await fetch(`${url}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(invalidJson.status, 400);
    assert.equal((await invalidJson.json()).message, "JSON inválido.");

    const wrongType = await fetch(`${url}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload()),
    });
    assert.equal(wrongType.status, 415);

    const wrongOrigin = await fetch(`${url}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://outro.test",
      },
      body: JSON.stringify(payload()),
    });
    assert.equal(wrongOrigin.status, 403);

    assert.equal(
      await store.transaction((tx) => tx.listOrders().then((o) => o.length)),
      0,
    );

    for (let attempt = 1; attempt <= 10; attempt++) {
      const response = await fetch(`${url}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "gerente@demo.local",
          password: "senha-incorreta",
        }),
      });
      assert.equal(response.status, 401, `tentativa ${attempt}`);
    }
    const blocked = await fetch(`${url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "gerente@demo.local",
        password: "senha-incorreta",
      }),
    });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  });
});
