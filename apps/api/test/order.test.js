import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

async function request(repository, run) {
  const server = createApp(repository).listen(0, "127.0.0.1");

  await new Promise((resolve) => server.once("listening", resolve));

  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("UC03: registra pedido com itens e gera senha de atendimento", async () => {
  await request(
    {
      list: async () => [],
    },
    async (url) => {
      const response = await fetch(`${url}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inPerson: true,
          items: [
            {
              cut: "picanha",
              quantity: 2,
              unitOfMeasure: "kg",
            },
          ],
        }),
      });

      assert.equal(response.status, 201);

      const data = await response.json();

      assert.equal(data.message, "Order registered successfully.");
      assert.ok(data.orderId);
      assert.ok(data.serviceTicket);
      assert.equal(data.order.status, "REGISTERED");
      assert.equal(data.order.inPerson, true);
      assert.equal(data.order.orderItems.length, 1);
      assert.equal(data.order.orderItems[0].cut, "picanha");
      assert.equal(data.order.orderItems[0].quantity, 2);
      assert.equal(data.order.orderItems[0].unitOfMeasure, "kg");
    },
  );
});

test("UC03: rejeita pedido sem itens", async () => {
  await request(
    {
      list: async () => [],
    },
    async (url) => {
      const response = await fetch(`${url}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inPerson: true,
          items: [],
        }),
      });

      assert.equal(response.status, 400);

      const data = await response.json();

      assert.equal(
        data.error,
        "The order must contain at least one item.",
      );
    },
  );
});