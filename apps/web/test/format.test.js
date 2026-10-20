import test from 'node:test';
import assert from 'node:assert/strict';
import {priceFromInput} from '../src/format.js';
test('Preço administrativo: aceita vírgula e ponto sem perder casas decimais',()=>{
 assert.equal(priceFromInput('42,50'),4250);
 assert.equal(priceFromInput('42.50'),4250);
 assert.equal(priceFromInput('0'),0);
 assert.equal(priceFromInput('100000,00'),10000000);
});
test('Preço administrativo: rejeita frações de centavo e entradas ambíguas',()=>{
 for(const value of ['','-1','1e3','1.000,00','42,501','100000,01','texto'])assert.throws(()=>priceFromInput(value));
});
