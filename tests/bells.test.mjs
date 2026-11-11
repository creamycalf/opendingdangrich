import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {initialBellCount,spawnBells,bellItem,collectBell,bellPositionAllowed} from '../app/src/bells.mjs';import {applyEffect} from '../app/src/effects.mjs';import {gameRoadPlacement} from '../app/src/road-items.mjs';
const fx=JSON.parse(fs.readFileSync(new URL('./fixtures/original-bells.json',import.meta.url))),maps=Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${i}.json`,import.meta.url))));
test('bell positions and every random draw match original spawn on eight maps; all 1000 reward draws match',()=>{
 for(const row of fx.traces){const map=maps[row.map],g={seed:row.seed,roadItems:[],bells:[]};let k=0;spawnBells(map,g,initialBellCount(map),n=>{const d=row.draws[k++];assert.equal(d[0],n);return d[1];});assert.deepEqual(g.bells,row.locations.map(([x,y])=>y*map.width+x));assert.equal(k,row.draws.length);}
 for(let d=0;d<1000;d++)assert.equal(bellItem(d),fx.items[d]);
});
test('bell pickup rerolls restricted reward, replenishes count, saves, and flight blocks pickup',()=>{
 const map=maps[4],g=E.createGame(map),at=g.bells[0],before=g.players[0].inventory.length,count=g.bells.length;
 const blocked=structuredClone(g);applyEffect(blocked.players[0],'original-38');assert.equal(collectBell(map,blocked,at,()=>{throw Error('protected pickup consumed RNG');}),null);assert.deepEqual(blocked.bells,g.bells);
 let draws=0;const item=collectBell(map,g,at,n=>n===1000?(draws++===0?230:0):E.random(g,n));assert.equal(item,'timeCloth');assert.equal(draws,2);assert.equal(g.players[0].inventory.length,before+1);assert.equal(g.bells.length,count);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
 for(const i of g.bells)assert.deepEqual(gameRoadPlacement(map,g,i),[]);
});
test('bell pickup happens on landing, survives reload, and does not repeat during ground event and property prompts',()=>{
 const map=maps[4],g=E.createGame(map,{startDate:'2000-05-02'}),at=g.bells[0];g.players[0].at=at;g.phase='landed';const count=g.players[0].inventory.length;E.landing(map,g);assert.equal(g.players[0].inventory.length,count);E.advance(map,g);assert.equal(g.players[0].inventory.length,count+1);const saved=E.restore(map,JSON.stringify(g));
 for(const h of [g,saved]){while(h.phase==='resolving')E.advance(map,h);assert.equal(h.players[0].inventory.length,count+1);}assert.deepEqual(g,saved);
});
