import test from "node:test";
import assert from "node:assert/strict";
import {
  parseQuantity,
  addItem,
  restoreCart,
  reconcileCart,
} from "../src/cart.js";
const cut = { id: "picanha", available: true, units: ["kg"] };
test("UC02: aceita kg com vírgula e soma seleções repetidas", () => {
  assert.equal(parseQuantity("0,750", "kg"), 0.75);
  const cart = addItem([], cut, "0,750", "kg");
  assert.deepEqual(addItem(cart, cut, "0.250", "kg"), [
    { cutId: "picanha", unit: "kg", quantity: 1 },
  ]);
});
test("UC02: impede quantidade inválida, fracionamento de unidade e corte indisponível", () => {
  for (const value of ["0", "-1", "abc", "Infinity", "1e2", "101", "0.0001"])
    assert.throws(() => parseQuantity(value, "kg"));
  assert.throws(() => parseQuantity("1.5", "un"));
  assert.throws(() => addItem([], cut, "1", "un"));
  assert.throws(() => addItem([], { ...cut, available: false }, "1", "kg"));
  assert.throws(() =>
    addItem([{ cutId: cut.id, unit: "kg", quantity: 99 }], cut, "2", "kg"),
  );
});
test("UC02: recupera seleção local e descarta dados corrompidos ou preços adulterados", () => {
  assert.deepEqual(restoreCart("bad json"), []);
  assert.deepEqual(
    restoreCart(
      JSON.stringify([
        { cutId: "picanha", unit: "kg", quantity: 1, priceCents: 1 },
        { cutId: "picanha", unit: "kg", quantity: 1 },
        { cutId: "x", unit: "un", quantity: -2 },
      ]),
    ),
    [{ cutId: "picanha", unit: "kg", quantity: 1 }],
  );
});
test("UC02: retira da seleção produtos removidos ou indisponíveis", () => {
  assert.deepEqual(
    reconcileCart(
      [{ cutId: "picanha", unit: "kg", quantity: 1 }],
      [{ ...cut, available: false }],
    ),
    [],
  );
});
