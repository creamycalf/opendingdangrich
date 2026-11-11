import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {checkpoint,oldestCheckpoint,rewindHistory} from '../app/src/time-history.mjs';
import {prepareHermitEvent,drawHermitEvent} from '../app/src/hermit.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url)));
const game=()=>E.createGame(map,{startDate:'2000-04-03'});
test('six original rolling slots become eligible only when next slot exists, then keep oldest cycle',()=>{
 const g=game();assert.equal(g.history.next,1);assert.equal(prepareHermitEvent(map,g,{id:33},()=>0),false);
 for(let round=2;round<=5;round++){g.round=round;checkpoint(g);assert.equal(oldestCheckpoint(g),null);}
 g.round=6;checkpoint(g);assert.equal(oldestCheckpoint(g).round,1);assert.equal(prepareHermitEvent(map,g,{id:33},()=>0),true);
 g.round=7;checkpoint(g);assert.equal(oldestCheckpoint(g).round,2);
 assert.equal(g.history.slots.filter(Boolean).length,6);assert.ok(g.history.slots.every(s=>!Object.hasOwn(s,'history')));
 assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
test('normal complete player cycles checkpoint, extra actions do not, slowed days still checkpoint',()=>{
 const g=game();g.players.forEach(p=>p.control='human');
 for(let i=0;i<3;i++){g.phase='end';E.nextTurn(map,g);}assert.equal(g.history.next,1);
 g.phase='end';g.extraTurn=true;E.nextTurn(map,g);assert.equal(g.history.next,1);
 g.extraTurn=false;g.slowDays=4;g.phase='end';E.nextTurn(map,g);assert.equal(g.history.next,2);assert.equal(g.round,1);assert.equal(g.dayCycle,1);
 const h=oldestCheckpoint({...g,history:{...g.history,next:1}});assert.equal(h.turn,0);assert.equal(h.phase,'ready');
});
test('time machine restores all board/player state, clears ring and preserves current RNG and monotonic action serial',()=>{
 const g=game(),expected=structuredClone(g.history.slots[0]);
 for(let i=2;i<=6;i++){g.round=i;checkpoint(g);}
 const lot=map.cells.findIndex(c=>c.event===1);g.owners[lot]=0;g.levels[lot]=4;g.kinds[lot]=1;g.players[0].cash=1;g.players[1].inventory.push('charm');g.seed=99;g.turnSerial=50;
 assert.equal(rewindHistory(g),1);assert.deepEqual(g.players,expected.players);assert.deepEqual(g.owners,expected.owners);assert.equal(g.seed,99);assert.equal(g.turnSerial,51);assert.equal(oldestCheckpoint(g),null);assert.equal(g.history.next,0);
 assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
test('natural hermit selection rewinds through command transaction and survives notice reload/replay',()=>{
 let g=game();for(let i=2;i<=6;i++){g.round=i;checkpoint(g);}g.phase='prompt';g.pending={kind:'hermit'};
 let seed;for(let n=0;n<10000;n++){const candidate=structuredClone(g);candidate.seed=n;if(drawHermitEvent(map,candidate,k=>E.random(candidate,k)).id===33){seed=n;break;}}
 assert.notEqual(seed,undefined);g.seed=seed;const record={format:'dingdang-replay-v1',initial:structuredClone(g),commands:[{type:'answer',action:'chest',value:1}]};
 g=executeCommand(map,g,record.commands[0]).state;assert.equal(g.round,1);assert.match(g.pending.text,/时光机|時光機/);assert.equal(g.pending.resume,'ready');assert.equal(g.history.slots.filter(Boolean).length,0);
 assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,record),g);
 g=executeCommand(map,g,{type:'answer',action:'ok'}).state;assert.equal(g.phase,'ready');assert.equal(g.turn,0);assert.equal(g.pending,null);
});
test('history validation rejects nested/corrupt/cross-map snapshots; old saves start with no fabricated past',()=>{
 const g=game();for(const mutate of [g=>g.history.next=6,g=>g.history.slots[0].history={},g=>g.history.slots[0].players[0].cash=-1,g=>g.history.slots[0].map=0]){
  const bad=structuredClone(g);mutate(bad);assert.throws(()=>E.restore(map,JSON.stringify(bad)),/存档/);
 }
 delete g.history;g.ruleset='town-flow-27';const restored=E.restore(map,JSON.stringify(g));assert.equal(restored.ruleset,E.RULESET);assert.equal(restored.history.slots.filter(Boolean).length,0);
});
