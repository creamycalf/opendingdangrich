import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {executeCommand,replayCommands} from '../app/src/commands.mjs';import {itemKey} from '../app/src/inventory.mjs';import {applyEffect} from '../app/src/effects.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));const map=read('../app/public/assets/maps/4.json'),fx=read('./fixtures/original-swap.json');
test('situation gun exchanges original money fields, all inventory slots and land owners',()=>{
 const g=E.createGame(map,{startDate:'2000-04-03'});for(let i=0;i<4;i++)Object.assign(g.players[i],fx.before.players[i]);
 for(let i=0;i<2;i++)g.players[i].inventory=fx.before.inventory[i].flatMap((count,id)=>Array(count).fill(itemKey(id)));
 // Add the consumed gun separately so the x86 swap fixture starts after use.
 g.players[0].inventory.push('original-33');fx.lots.forEach((lot,n)=>{g.owners[lot]=fx.before.owners[n];g.levels[lot]=(Math.floor(n/3)+n%3)%5;});
 applyEffect(g.players[0],'charm',0,true);const before=structuredClone(g),command={type:'useItem',item:'original-33',target:1};
 const next=executeCommand(map,g,command).state;
 assert.deepEqual(next.players.map(p=>Object.fromEntries(['cash','bank','interest','walkPoints'].map(k=>[k,p[k]]))),fx.after.players);
 assert.deepEqual(next.players.slice(0,2).map(p=>Array.from({length:42},(_,i)=>p.inventory.filter(id=>id===itemKey(i)).length)),fx.after.inventory);
 assert.deepEqual(fx.lots.map(lot=>next.owners[lot]),fx.after.owners);assert.deepEqual(next.levels,before.levels);
 assert.equal(next.players[0].at,before.players[1].at);assert.equal(next.players[1].at,before.players[0].at);assert.deepEqual(next.players[0].effects,before.players[0].effects);assert.equal(next.phase,'end');
 assert.deepEqual(E.restore(map,JSON.stringify(next)),next);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial:g,commands:[command]}),next);
});
test('situation gun rejects protected and friendship targets without spending the gun',()=>{
 const g=E.createGame(map);g.players[0].inventory=['original-33'];applyEffect(g.players[1],'original-19',1,true);const before=structuredClone(g);
 assert.throws(()=>executeCommand(map,g,{type:'useItem',item:'original-33',target:1}),/无法攻击/);assert.deepEqual(g,before);
});
