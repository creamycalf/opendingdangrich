import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {roadItemPlacement,gameRoadPlacement} from '../app/src/road-items.mjs';import {canEnterTunnel,crossTunnel} from '../app/src/tunnel.mjs';import {applyEffect,tickPlayerEffects,EFFECTS} from '../app/src/effects.mjs';import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const fx=JSON.parse(fs.readFileSync(new URL('./fixtures/original-tunnel.json',import.meta.url))),maps=Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${i}.json`,import.meta.url)))),map=maps[4];
test('tunnel placement matches original x86 on all eight maps and its internal shrink constructor',()=>{
 for(const row of fx.placements){assert.equal(roadItemPlacement(maps[row.map],row.at).length>0,row.empty,JSON.stringify(row));assert.equal(roadItemPlacement(maps[row.map],row.at,()=>true).length>0,row.occupied);}
 for(const key of ['duration','mask','value'])assert.equal(EFFECTS['original-43'][key],fx.constructor[key]);
});
test('tunnel is a saved five-day road object, with atomic selection and replay',()=>{
 const g=E.createGame(map,{startDate:'2000-05-02'});g.players[0].inventory=['original-6'];const at=map.cells.findIndex((c,i)=>gameRoadPlacement(map,g,i).length);const command={type:'useItem',item:'original-6',target:at},after=executeCommand(map,g,command).state;
 assert.equal(after.roadItems[0].id,'original-6');assert.equal(after.roadItems[0].remaining,5);assert.deepEqual(after.players[0].inventory,[]);assert.deepEqual(E.restore(map,JSON.stringify(after)),after);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial:g,commands:[command]}),after);
 assert.throws(()=>executeCommand(map,g,{...command,target:g.players[0].at}));
});
test('directional tunnel changes stride, removes obstructing states, grants crossing steps, expires and restores',()=>{
 for(let d=0;d<4;d++){const g=E.createGame(map,{startDate:'2000-05-02'}),p=g.players[0],t={direction:d};p.direction=d^1;
  applyEffect(p,'original-1');assert.equal(canEnterTunnel(p,t,d^1),true);assert.equal(canEnterTunnel(p,t,d),false);assert.equal(canEnterTunnel(p,t,d^2),false);
  g.remaining=1;assert.ok(crossTunnel(map,g,t));assert.equal(g.remaining,3);assert.equal(p.small,true);assert.equal(p.effects.some(e=>e.id==='original-1'),false);assert.equal(p.effects.find(e=>e.id==='original-43').remaining,5);
  assert.equal(canEnterTunnel(p,t,d),true);p.direction=d;assert.ok(crossTunnel(map,g,t));assert.equal(p.small,false);assert.equal(p.effects.some(e=>e.id==='original-43'),false);
  p.direction=d^1;crossTunnel(map,g,t);for(let i=0;i<5;i++){p.effectTickPending=true;tickPlayerEffects(p);}assert.equal(p.small,false);
 }
 const g=E.createGame(map),p=g.players[0];applyEffect(p,'original-14');p.effects[0].active=true;const before=structuredClone(g);assert.equal(crossTunnel(map,g,{direction:p.direction^1}),'');assert.deepEqual(g,before);
});
