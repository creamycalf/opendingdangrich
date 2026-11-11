import {test} from 'node:test';import assert from 'node:assert/strict';import {missileRedirect} from '../app/src/special-buildings.mjs';import {restore} from '../app/src/engine.mjs';import fs from 'node:fs';import {createGame} from '../app/src/engine.mjs';import {redirectAttack} from '../app/src/target-items.mjs';import {itemKey} from '../app/src/inventory.mjs';import {EFFECTS} from '../app/src/effects.mjs';
const map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json'));const f=JSON.parse(fs.readFileSync('tests/fixtures/v126-camera.json'));let diffs=[];
test('840 new-PC reflection callback samples including multi-state order and same source',()=>{for(const r of f.rows){const g=createGame(map,{startDate:'2000-04-03'});g.players.forEach(p=>{p.character='doraemon';p.effects=[];});g.players[r.destination].effects=r.statuses.map(id=>({id:itemKey(id),source:r.sameSource?0:1,remaining:EFFECTS[itemKey(id)]?.duration??5}));const camera={id:'original-7',source:r.sameSource&&r.destination===1&&r.statuses.includes(7)?0:1,remaining:10,target:r.destination};g.players[1].effects=g.players[1].effects.filter(e=>e.id!=='original-7');g.players[1].effects.push(camera);const actual=redirectAttack(g,itemKey(r.id),1,r.sameDonor?r.destination:3),consumed=!g.players[1].effects.includes(camera);if(actual!==r.actual||consumed!==r.consumed)diffs.push({...r,js:{actual,consumed}});}
assert.deepEqual(diffs,[]);});

test('110 representable new-PC missile samples: eligibility, protection and consumption',()=>{
 for(const r of f.missiles){
  // A single character cannot simultaneously carry both character identity flags.
  if(r.destination===0&&r.nobita&&r.shizuka)continue;
  const g=createGame(map,{startDate:'2000-04-03'});g.players.forEach(p=>{p.character='doraemon';p.effects=[];});
  g.players[r.destination].effects=r.statuses.map(id=>({id:itemKey(id),source:1,remaining:EFFECTS[itemKey(id)]?.duration??5}));
  g.players[r.destination].eliminated=!r.alive;g.players[0].character=r.nobita?'nobita':'doraemon';if(r.shizuka)g.players[r.destination].character='shizuka';
  const camera={id:'original-7',source:1,remaining:10,target:r.destination};g.players[1].effects=g.players[1].effects.filter(e=>e.id!=='original-7');g.players[1].effects.push(camera);
  assert.equal(missileRedirect(g,0,1),r.actual,JSON.stringify(r));assert.equal(!g.players[1].effects.includes(camera),r.consumed,JSON.stringify(r));
 }
});
test('missile consumes only first camera; forbidden destination retains it; resulting state survives save',()=>{
 const g=createGame(map,{startDate:'2000-04-03'}),first={id:'original-7',source:1,remaining:10,target:2},second={id:'original-7',source:2,remaining:10,target:3};
 g.players[1].effects=[first];g.players[2].effects=[second];assert.equal(missileRedirect(g,0,1),2);assert.deepEqual(g.players[1].effects,[]);assert.deepEqual(g.players[2].effects,[second]);assert.deepEqual(restore(map,JSON.stringify(g)),g);
 g.players[1].effects=[first];g.players[2].effects.push({id:'original-19',source:2,remaining:5});assert.equal(missileRedirect(g,0,1),1);assert.deepEqual(g.players[1].effects,[first]);
});

