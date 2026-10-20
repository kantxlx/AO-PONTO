import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createApp } from "../src/app.js";
import {
  createMemoryOperations,
  createPostgresOperations,
} from "../src/repositories/operations.js";
import { createOperationsService } from "../src/services/operationsService.js";
test("Carga: 5 clientes simultâneos e 200 consultas ao catálogo", async () => {
  const store = process.env.TEST_DATABASE_URL
    ? createPostgresOperations(process.env.TEST_DATABASE_URL)
    : await createMemoryOperations({ seedUsers: false });
  const repo = {
    list: () =>
      store.transaction(async (tx) =>
        (await tx.listCuts()).filter((c) => c.active),
      ),
  };
  const server = createApp(repo, {
    operations: createOperationsService(store),
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const durations = [];
  try {
    await Promise.all(
      Array.from({ length: 5 }, async () => {
        for (let i = 0; i < 40; i++) {
          const start = performance.now();
          const response = await fetch(url + "/api/cuts");
          assert.equal(response.status, 200);
          assert.ok((await response.json()).cuts.length > 0);
          durations.push(performance.now() - start);
        }
      }),
    );
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)],
      max = durations.at(-1);
    console.log(
      `Carga ${process.env.TEST_DATABASE_URL ? "PostgreSQL" : "memória"}: 200 respostas, p95=${p95.toFixed(1)}ms, máximo=${max.toFixed(1)}ms`,
    );
    assert.ok(
      max < 3000,
      `Resposta máxima ${max.toFixed(1)}ms excede a meta de 3s neste ambiente`,
    );
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
  }
});
