import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {originalAiBank,originalAiShop} from '../app/src/ai-commerce.mjs';
import {itemKey} from '../app/src/inventory.mjs';
const evidence=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-ai-commerce.json',import.meta.url)));
const maps=Array.from({length:8},(_,id)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps-v126/${id}.json`,import.meta.url))));
function fixture(map,kind,character='nobita'){
  const players=[character,...E.CHARACTERS.map(c=>c.id).filter(c=>c!==character).slice(0,3)].map(character=>({character,control:'ai'}));
  const g=E.createGame(map,{startDate:'2000-04-03',players}),lot=map.cells.findIndex(c=>c.event===(kind==='bank'?6:5)&&E.adjacent(map,c.y*map.width+c.x).some(i=>E.walkable(map.cells[i])));
  g.players[0].at=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));g.players[0].half=null;
  g.phase='prompt';g.pending={kind,lot};g.queue=[];g.afterQueue='moving';g.remaining=2;
  return g;
}
test('seven AI profiles match 504 original bank and 3381 original shop instruction executions',()=>{
  for(const row of evidence.bank)assert.deepEqual(originalAiBank(row),{cash:row.targetCash,bank:row.targetBank});
  for(const row of evidence.shops){
    const prices=maps[row.map].shops[row.shop].rawParameters;
    assert.deepEqual(originalAiShop({...row,prices}),{cash:row.afterCash,bought:row.bought});
  }
});
test('AI bank commits once, preserves sub-integer no-change cases, caps only on refresh, restores and resumes movement',()=>{
  const map=maps[4];
  for(const row of evidence.bank){
    const g=fixture(map,'bank',row.character);g.startDate=`2000-01-${String(row.day).padStart(2,'0')}`;
    const p=g.players[0];p.cash=row.cash;p.bank=row.bank;g.pending.withdrawOnly=row.withdrawOnly;
    assert.deepEqual(E.aiAnswer(map,g),['aiBank']);E.answer(map,g,...E.aiAnswer(map,g));
    const changed=Math.trunc(row.cash)!==Math.trunc(row.targetCash);
    assert.equal(p.cash,changed?Math.min(999999,row.targetCash):row.cash);assert.equal(p.bank,changed?row.targetBank:row.bank);
    assert.equal(g.pending,null);assert.equal(g.phase,'resolving');assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
    E.advance(map,g);assert.equal(g.phase,'moving');assert.equal(g.remaining,2);
  }
});
test('AI shop executes the complete bounded purchase batch, keeps owned items, and survives restore',()=>{
  // All profiles and maps, several inventories and inflation/discount choices.
  for(const row of evidence.shops.filter(row=>[1000,10000,999999].includes(row.cash))){
    const map=maps[row.map],shop=map.shops[row.shop],g=fixture(map,'shop',row.character),lot=shop.y*map.width+shop.x;
    g.pending.lot=lot;g.players[0].at=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));
    const p=g.players[0];p.cash=row.cash;p.inventory=row.held.map(itemKey);g.inflation=row.multiplier;g.shopDiscount=row.discount===60?1:0;
    E.answer(map,g,...E.aiAnswer(map,g));assert.equal(p.cash,row.afterCash);assert.deepEqual(p.inventory,[...row.held,...row.bought].map(itemKey));
    assert.equal(g.phase,'resolving');assert.equal(g.pending,null);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
  }
});
test('passing bank forbids deposits, stopped bank allows both directions, and Sunday closes only new games',()=>{
  const map=maps[4];
  const passing=fixture(map,'bank');passing.queue=[{kind:'facility',lot:passing.pending.lot}];passing.pending=null;passing.phase='resolving';E.advance(map,passing);
  assert.equal(passing.pending.withdrawOnly,true);assert.deepEqual(E.restore(map,JSON.stringify(passing)),passing);
  for(const args of [['bankPosition',49],['deposit',100]]){const before=JSON.stringify(passing);assert.throws(()=>E.answer(map,passing,...args),/只能提款/);assert.equal(JSON.stringify(passing),before);}
  E.answer(map,passing,'bankPosition',100);assert.equal(passing.players[0].bank,0);
  const stopped=fixture(map,'bank');E.answer(map,stopped,'bankPosition',0);assert.equal(stopped.players[0].cash,0);
  for(const old of [false,true]){
    const g=fixture(map,'bank');if(old)delete g.pcEconomyVersion;g.startDate='2000-04-02';g.queue=[{kind:'facility',lot:g.pending.lot}];g.pending=null;g.phase='resolving';E.advance(map,g);
    assert.equal(g.pending.kind,old?'bank':'notice');if(!old)assert.match(g.pending.text,/星期日/);
  }
});
test('legacy bank and shop keep prior commands and refuse new atomic AI commands',()=>{
  const map=maps[4],g=fixture(map,'bank');delete g.pcEconomyVersion;g.players[0].cash=400;g.players[0].bank=1000;
  assert.deepEqual(E.aiAnswer(map,g),['withdraw',700]);assert.throws(()=>E.answer(map,g,'aiBank'),/不支持/);
  const shop=fixture(map,'shop');delete shop.pcEconomyVersion;assert.notEqual(E.aiAnswer(map,shop)[0],'aiShop');assert.throws(()=>E.answer(map,shop,'aiShop'),/不支持/);
});
