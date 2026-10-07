import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
async function request(repository, run) {
  const server = createApp(repository).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('UC01: entrega catálogo com indisponibilidade e preço em centavos', async () => {
  const cuts = [{ id: 'c1', priceCents: 3990, units: ['kg'], available: false }];
  await request({ list: async () => cuts }, async url => {
    const response = await fetch(`${url}/api/cuts`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual((await response.json()).cuts, cuts);
  });
});
test('UC01: falha do banco retorna erro recuperável sem dados internos', async () => {
  await request({ list: async () => { throw new Error('internal db error'); } }, async url => {
    const response = await fetch(`${url}/api/cuts`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).message.includes('internal'), false);
  });
});
