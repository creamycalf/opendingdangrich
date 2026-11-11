import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bankTransfer} from '../app/src/bank-transfer.mjs';
test('all 101 slider positions match PC bank instructions for five balance pairs',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/pc-v126-bank.json',import.meta.url)));
 assert.equal(fixture.rows.length,505);
 for(const [cash,bank,position,nextCash,nextBank] of fixture.rows){
  const preview=bankTransfer(cash,bank,position);
  assert.equal(preview.cash,nextCash);assert.equal(preview.bank,nextBank);
 }
});
