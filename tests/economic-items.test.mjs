import {reachLandingCharge} from './arrival-helper.mjs';
import {originalLandItemNeighbor} from '../app/src/land-items.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {applyEffect,canAttackPlayer,rentRecipient} from '../app/src/effects.mjs';
import {advanceDayCycle} from '../app/src/day-clock.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
import {itemKey} from '../app/src/inventory.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const map=read('../app/public/assets/maps/4.json'),fixture=read('./fixtures/original-day-clock.json');
const create=()=>E.createGame(map,{startDate:'2000-04-30'});
test('slow date cycle and friendship targeting match original x86 paths',()=>{
 for(const c of fixture.daily){const g={round:100,slowDays:c.days,dayCycle:c.cycle};advanceDayCycle(g);assert.deepEqual(g,{round:c.afterRound,slowDays:c.afterDays,dayCycle:c.afterCycle});assert.equal(g.slowDays?2:1,c.cyclesPerDay);}
 for(const c of fixture.friends){const g=create();applyEffect(g.players[1],'original-27',c.linked?0:2,false);assert.equal(canAttackPlayer(g.players[1],g.players[0],1,itemKey(c.attack),0),c.allowed);}
});
test('crazy clock takes ten full cycles for five dates, saves mid-date, and rejects overlap atomically',()=>{
 let g=create();g.players[0].inventory=['original-16'];g=executeCommand(map,g,{type:'useItem',item:'original-16'}).state;
 const firstDate=E.dateParts(g);
 for(let cycle=0;cycle<10;cycle++){
  g.turn=3;g.phase='end';const cmd={type:'nextTurn'};g=executeCommand(map,g,cmd).state;
  assert.equal(g.round,1+Math.floor((cycle+1)/2));assert.equal(g.slowDays,5-Math.floor((cycle+1)/2));
  assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
  if(g.pending?.kind==='monthly')g=executeCommand(map,g,{type:'answer',action:'ok'}).state;
  if(cycle===0){assert.deepEqual(E.dateParts(g),firstDate);const reject=structuredClone(g);reject.players[0].inventory.push('original-16');assert.throws(()=>executeCommand(map,reject,{type:'useItem',item:'original-16'}));}
 }
 assert.equal(g.slowDays,0);assert.equal(g.dayCycle,0);
});
test('clock and friendship commands replay and migrate rules20 without altering old dates',()=>{
 const initial=create();initial.players[0].inventory=['original-16'];const commands=[{type:'useItem',item:'original-16'},{type:'nextTurn'}];let g=structuredClone(initial);for(const c of commands)g=executeCommand(map,g,c).state;
 assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
 const old=create();old.ruleset='town-flow-20';delete old.dayCycle;delete old.slowDays;const restored=E.restore(map,JSON.stringify(old));assert.equal(restored.round,old.round);assert.equal(restored.slowDays,0);assert.equal(restored.dayCycle,0);
 const friends=create();friends.players[0].inventory=['original-27'];const used=executeCommand(map,friends,{type:'useItem',item:'original-27',target:1}).state;assert.equal(canAttackPlayer(used.players[1],used.players[0],1,'air',0),false);assert.equal(canAttackPlayer(used.players[1],used.players[3],1,'air',3),true);assert.equal(canAttackPlayer(used.players[0],used.players[1],0,'air',1),true);assert.deepEqual(E.restore(map,JSON.stringify(used)),used);
});
test('tanuki suit redirects rent to its caster while preserving owner exemptions and amount',()=>{
 const g=create();g.turn=1;const p=g.players[1];applyEffect(p,'original-15',0,false);
 let from,to,lot;for(let i=0;i<map.cells.length;i++)if(E.walkable(map.cells[i])){p.at=i;p.previous=-1;for(const n of E.choices(map,g)){const l=originalLandItemNeighbor(map,n);if(map.cells[l]?.event===1&&map.cells[n].event===0){from=i;to=n;lot=l;break;}}if(lot!==undefined)break;}
 assert.ok(lot!==undefined);p.at=from;g.owners[lot]=2;g.levels[lot]=2;g.phase='moving';g.remaining=1;
 const before=g.players.map(p=>p.cash);E.step(map,g,to);reachLandingCharge(map,g);const charge=g.queue.find(e=>e.rent);assert.equal(charge.creditor,0);assert.equal(charge.amount,E.rent(map,g,lot));E.advance(map,g);
 assert.equal(g.players[0].cash,Math.fround(before[0]+charge.amount));assert.equal(p.cash,Math.fround(before[1]-charge.amount));assert.equal(g.players[2].cash,before[2]);assert.equal(g.rentPool,charge.amount);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
 const protectedGame=create();protectedGame.turn=1;protectedGame.players[1].at=from;protectedGame.owners[lot]=2;protectedGame.levels[lot]=2;applyEffect(protectedGame.players[1],'original-15',0,false);applyEffect(protectedGame.players[2],'original-25',3,false);protectedGame.phase='moving';protectedGame.remaining=1;E.step(map,protectedGame,to);reachLandingCharge(map,protectedGame);assert.equal(protectedGame.queue.some(e=>e.rent),false);
});
