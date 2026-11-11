import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {originalAiBuy,originalAiProperty,PROPERTY_AI_PROFILES} from '../app/src/property-ai.mjs';
import {createGame,aiAnswer,answer,restore,landPrice,upgradeCost,adjacent,walkable} from '../app/src/engine.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-property-ai.json',import.meta.url)));
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
test('original x86 purchase and property management branches, seven characters',()=>{
  for(const [name,p] of Object.entries(fixture.profiles))assert.deepEqual(PROPERTY_AI_PROFILES[name],p.weights);
  for(const row of fixture.buy){let calls=0;assert.equal(originalAiBuy(row,n=>{assert.equal(n,2);calls++;return row.randomBit;}),row.buy,JSON.stringify(row));assert.equal(calls,row.rngCalls);}
  for(const row of fixture.manage){let calls=0;assert.equal(originalAiProperty(row,n=>{assert.equal(n,2);calls++;return row.randomBit;}),row.action,JSON.stringify(row));assert.equal(calls,row.rngCalls);}
});
test('new PC games opt into original AI; old saves keep cash buffer and RNG behavior',()=>{
  const g=createGame(map),lot=map.cells.findIndex(c=>c.event===1&&c.price>0),p=g.players[0];
  assert.equal(g.propertyAiVersion,'pc-v126');
  p.character='suneo';p.name='小夫';g.players[1].character='nobita';
  g.phase='prompt';g.pending={kind:'buy',lot};p.cash=landPrice(map.cells[lot],g)+1;
  assert.deepEqual(aiAnswer(map,g),['yes']);
  delete g.propertyAiVersion;const seed=g.seed;assert.deepEqual(aiAnswer(map,g),['no']);assert.equal(g.seed,seed);
  const old=createGame(map);delete old.propertyAiVersion;
  for(const slot of old.history.slots)if(slot)delete slot.propertyAiVersion;
  assert.equal(restore(map,JSON.stringify(old)).propertyAiVersion,undefined);
  assert.equal(restore(map,JSON.stringify(createGame(map))).propertyAiVersion,'pc-v126');
  old.propertyAiVersion='invented';assert.throws(()=>restore(map,JSON.stringify(old)));
});
test('AI upgrades with one spare unit and sells when unavailable and cash-poor',()=>{
  const g=createGame(map),p=g.players[0],lots=map.cells.flatMap((c,i)=>c.event===1&&c.price>0?[i]:[]),lot=lots[0];
  g.phase='prompt';g.pending={kind:'property',lot};g.owners[lot]=0;g.levels[lot]=0;g.kinds[lot]=0;
  p.cash=upgradeCost(map,g,lot)+1;
  assert.deepEqual(aiAnswer(map,g),['upgrade']);answer(map,g,'upgrade');assert.equal(p.cash,1);assert.equal(g.levels[lot],1);
  for(const i of lots.slice(0,10)){g.owners[i]=0;g.levels[i]=4;g.kinds[i]=1;}
  g.phase='prompt';g.pending={kind:'property',lot};p.cash=0;p.bank=1000;
  assert.deepEqual(aiAnswer(map,g),['sell']);answer(map,g,'sell');assert.equal(g.owners[lot],undefined);
});
test('new AI actions are accepted at price boundaries, inflation and every level',()=>{
  const lot=map.cells.findIndex(c=>c.event===1&&c.price>0);
  for(const character of Object.keys(PROPERTY_AI_PROFILES))for(const inflation of [1,1.5,2])for(let level=0;level<=4;level++){
    const initial=createGame(map);initial.history={next:0,slots:Array(6).fill(null)};
    initial.inflation=inflation;initial.players[0].character=character;
    const base=landPrice(map.cells[lot],initial),cost=level<4?Math.trunc(base*[1,1.5,2.25,3.375][level]):base;
    for(const cash of [0,base-1,base,base+1,base*inflation,base*inflation+1,cost-1,cost,cost+1,cost+99,cost+100])for(const kind of ['buy','property']){
      const g=structuredClone(initial);g.phase='prompt';g.pending={kind,lot};g.players[0].cash=cash;
      if(kind==='property'){g.owners[lot]=0;g.levels[lot]=level;g.kinds[lot]=level?1:0;}
      const after=executeCommand(map,g,{type:'aiAnswer'}).state;
      assert.equal(after.phase,'resolving');assert.ok(after.players[0].cash>=0);
    }
  }
});
test('legacy and new property choices replay using their saved AI version',()=>{
  const lot=map.cells.findIndex(c=>c.event===1&&c.price>0);
  for(const current of [false,true]){
    const initial=createGame(map);if(!current)delete initial.propertyAiVersion;
    initial.phase='prompt';initial.pending={kind:'buy',lot};initial.players[0].cash=2000;
    initial.visitAt=adjacent(map,lot).find(i=>walkable(map.cells[i]));
    const command={type:'aiAnswer'},expected=executeCommand(map,initial,command).state;
    assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[command]}),expected);
  }
});
