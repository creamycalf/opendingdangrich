import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {originalLuckyShot,originalLuckyShotV126} from '../app/src/effects.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';import {buildSpecial,specialArrival} from '../app/src/special-buildings.mjs';import {originalLandItemNeighbor,landItemStatus} from '../app/src/land-items.mjs';
const native=JSON.parse(fs.readFileSync(new URL('../docs/audits/items-2026-11-07-part-a-native.json',import.meta.url)));
test('v1.26 lucky shot matches all 1000 native cmp/jle branches; legacy stays separate',()=>{
 for(const row of native.luckyShot.samples)assert.equal(originalLuckyShotV126(row.draw),row.lucky);
 assert.equal(native.luckyShot.samples.filter(r=>r.lucky).length,749);assert.equal(originalLuckyShot(500),false);assert.equal(originalLuckyShotV126(500),true);
});
test('PC lucky shot command consumes the same draw and persists corrected result',()=>{
 const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
 for(let seed=1;seed<101;seed++){const g=E.createGame(map,{seed});g.players[0].inventory=['original-12'];const expected=originalLuckyShotV126(E.random(structuredClone(g),1000));
 const cmd={type:'useItem',item:'original-12'},h=executeCommand(map,g,cmd).state;
 assert.equal(h.players[0].effects.find(e=>e.id==='original-12').lucky,expected);assert.deepEqual(E.restore(map,JSON.stringify(h)),h);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial:g,commands:[cmd]}),h);}
});
test('new-PC special level1 allows restore ray on own/enemy cannon and missile; time cloth removes enemy title',()=>{
 const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
 const at=map.cells.findIndex((c,i)=>E.walkable(c)&&map.cells[originalLandItemNeighbor(map,i)]?.event===1),lot=originalLandItemNeighbor(map,at);
 for(const id of ['original-40','original-41'])for(const owner of [0,1])for(const tool of ['restoreRay','timeCloth']){
  if(tool==='timeCloth'&&owner===0)continue;
  const g=E.createGame(map);g.players[0].at=at;g.owners[lot]=0;g.levels[lot]=0;buildSpecial(map,g,id);g.owners[lot]=owner;
  assert.equal(g.levels[lot],1);g.players[0].inventory=[tool];assert.equal(landItemStatus(map,g,tool).allowed,true);
  const cmd={type:'useItem',item:tool},h=executeCommand(map,g,cmd).state;assert.equal(h.kinds[lot]??0,0);assert.equal(h.levels[lot]??0,0);assert.equal(h.owners[lot],tool==='timeCloth'?undefined:owner);assert.equal(specialArrival(map,h),null);
  assert.deepEqual(E.restore(map,JSON.stringify(h)),h);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial:g,commands:[cmd]}),h);
 }
});
