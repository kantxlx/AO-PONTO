import test from "node:test";
import assert from "node:assert/strict";
import {
  money,
  number,
  normalize,
  priceFromInput,
  waitingTime,
} from "../src/format.js";
test("Preço administrativo: aceita vírgula e ponto sem perder casas decimais", () => {
  assert.equal(priceFromInput("42,50"), 4250);
  assert.equal(priceFromInput("42.50"), 4250);
  assert.equal(priceFromInput("0"), 0);
  assert.equal(priceFromInput("100000,00"), 10000000);
});
test("Preço administrativo: rejeita frações de centavo e entradas ambíguas", () => {
  for (const value of [
    "",
    "-1",
    "1e3",
    "1.000,00",
    "42,501",
    "100000,01",
    "texto",
  ])
    assert.throws(() => priceFromInput(value));
});
test("Apresentação: formata moeda, senha e busca sem acentos", () => {
  assert.equal(money(3995).replace(/\u00a0/g, " "), "R$ 39,95");
  assert.equal(money(0).replace(/\u00a0/g, " "), "R$ 0,00");
  assert.equal(number(7), "007");
  assert.equal(number(123), "123");
  assert.equal(normalize("Picanha à Moda"), "picanha a moda");
});
test("Tempo de espera: arredonda para baixo e trata relógio adiantado", () => {
  assert.equal(
    waitingTime(new Date(Date.now() - 30_000).toISOString()),
    "Agora",
  );
  assert.equal(
    waitingTime(new Date(Date.now() - 90_000).toISOString()),
    "Há 1 minuto",
  );
  assert.equal(
    waitingTime(new Date(Date.now() - 150_000).toISOString()),
    "Há 2 minutos",
  );
  assert.equal(
    waitingTime(new Date(Date.now() + 60_000).toISOString()),
    "Agora",
  );
});
