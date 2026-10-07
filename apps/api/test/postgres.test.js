import test from "node:test";
import assert from "node:assert/strict";
import { createCutRepository } from "../src/repositories/cuts.js";
test(
  "PostgreSQL: catálogo persistido contém preço, unidade e disponibilidade",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const repository = createCutRepository({
      catalogSource: "postgres",
      databaseUrl: process.env.TEST_DATABASE_URL,
    });
    try {
      const cuts = await repository.list();
      assert.equal(cuts.length, 8);
      assert.equal(cuts.find((cut) => cut.id === "picanha").priceCents, 7990);
      assert.deepEqual(cuts.find((cut) => cut.id === "picanha").units, ["kg"]);
      assert.equal(
        cuts.find((cut) => cut.id === "frango-inteiro").available,
        false,
      );
    } finally {
      await repository.close();
    }
  },
);
