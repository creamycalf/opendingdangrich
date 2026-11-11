import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {originalPropertyCharge,originalUpgradeCost,originalSaleValue} from '../app/src/property.mjs';
const oracle=JSON.parse(fs.readFileSync(new URL('./fixtures/original-property-charge.json',import.meta.url)));
const maps=Array.from({length:8},(_,id)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${id}.json`,import.meta.url))));

test('property charge matches 2965 original x86 cases, including connected lots, ownership breaks and float multipliers',()=>{
  assert.equal(oracle.rows.length,2965);
  for(const row of oracle.rows){
    const owners={},levels={};
    for(const [lot,level,owner] of row.ownership){owners[lot]=owner;levels[lot]=level;}
    const actual=originalPropertyCharge(maps[row.map],owners,levels,row.lot,row.multiplier);
    assert.equal(actual.amount,row.value,JSON.stringify(row));
    assert.equal(actual.lots.length,row.count);
  }
});

test('upgrade and sale quotes match original initialization handlers at every map price and level',()=>{
  for(const row of oracle.transactions){
    const cell=maps[row.map].cells[row.lot];
    assert.equal(originalSaleValue(cell,row.level),row.sale,JSON.stringify(row));
    if(row.level<4)assert.equal(originalUpgradeCost(cell,row.level),row.upgrade,JSON.stringify(row));
    else assert.throws(()=>originalUpgradeCost(cell,row.level));
  }
});
