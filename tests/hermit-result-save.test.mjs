import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {executeCommand,replayCommands} from '../app/src/commands.mjs';
import {HERMIT_EVENTS} from '../app/src/hermit-data.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
test('box result persists native slot and actual event category without rerolling or reapplying rewards',()=>{
 const categories=new Set();
 for(let seed=1;seed<=48;seed++)for(let selected=0;selected<3;selected++){
  const g=E.createGame(map,{seed,startDate:'2000-04-03'});g.phase='prompt';g.pending={kind:'hermit'};
  const command={type:'answer',action:'chest',value:selected},after=executeCommand(map,g,command).state,h=after.pending.hermitResult;
  assert.equal(h.selected,selected);assert.equal(h.good,!!HERMIT_EVENTS[h.event].good);categories.add(h.good);
  const restored=E.restore(map,JSON.stringify(after));assert.deepEqual(restored,after);
  assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial:g,commands:[command]}),after);
  const invalid=structuredClone(after);invalid.pending.hermitResult.selected=3;assert.throws(()=>E.restore(map,JSON.stringify(invalid)));
  const legacy=structuredClone(after);delete legacy.pending.hermitResult;assert.deepEqual(E.restore(map,JSON.stringify(legacy)),legacy);
 }assert.deepEqual([...categories].sort(),[false,true]);
});
test('hermit presentation records actual attached recipients and rejects invented effects in saves',()=>{
 let applied=0,immediate=0;
 for(let seed=1;seed<=160;seed++){
  const g=E.createGame(map,{seed,startDate:'2000-04-03'});g.phase='prompt';g.pending={kind:'hermit'};
  const after=executeCommand(map,g,{type:'answer',action:'chest',value:1}).state,h=after.pending.hermitResult;
  assert.ok(Array.isArray(h.appliedEvents));if(!h.appliedEvents.length){immediate++;continue;}
  for(const e of h.appliedEvents){applied++;assert.equal(e.name,after.players[e.player].name);assert.ok(after.players[e.player].events.some(x=>x.id===e.event&&x.remaining===e.remaining));}
  assert.deepEqual(E.restore(map,JSON.stringify(after)),after);
  const invalid=structuredClone(after);invalid.pending.hermitResult.appliedEvents[0].remaining=99;assert.throws(()=>E.restore(map,JSON.stringify(invalid)));
  const duplicate=structuredClone(after);duplicate.pending.hermitResult.appliedEvents.push(duplicate.pending.hermitResult.appliedEvents[0]);assert.throws(()=>E.restore(map,JSON.stringify(duplicate)));
  const legacy=structuredClone(after);delete legacy.pending.hermitResult.appliedEvents;assert.deepEqual(E.restore(map,JSON.stringify(legacy)),legacy);
 }
 assert.ok(applied>0&&immediate>0);
});
