import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {HERMIT_EVENTS} from '../app/src/hermit-data.mjs';
import {effectCapabilities,tickPlayerEffects,applyEffect} from '../app/src/effects.mjs';
import {createHermitEvent,prepareHermitEvent,applyHermitEvent,hermitGood,drawHermitEvent,attachHermitEvent} from '../app/src/hermit.mjs';
import {selectMiniGame} from '../app/src/minigame-selection.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const map=read('../app/public/assets/maps/4.json'),fx=read('./fixtures/original-hermit.json');
const game=()=>E.createGame(map,{startDate:'2000-04-03'});
test('cannon tax redirects its first victim through diamond, property tax does not',()=>{
 for(const id of [29,32]){
  const g=game(),land=map.cells.flatMap((c,i)=>c.event===1?[i]:[]);
  for(let i=0;i<4;i++){g.owners[land[i]]=i;g.levels[land[i]]=1;g.kinds[land[i]]=3;}
  applyEffect(g.players[0],'original-17',0);g.players[0].effects.at(-1).target=2;
  const r=applyHermitEvent(map,g,{id,all:false},()=>0);
  assert.deepEqual(r.charges.map(c=>c.debtor),id===29?[2,1,2,3]:[0,1,2,3]);
  assert.deepEqual(r.charges.map(c=>c.amount),Array(4).fill(id===29?100:200));
  assert.equal(g.players[0].effects.some(e=>e.id==='original-17'),id===32);
 }
 const g=game(),land=map.cells.findIndex(c=>c.event===1);
 g.owners[land]=0;g.kinds[land]=3;g.levels[land]=1;
 applyEffect(g.players[0],'original-17',0);g.players[0].effects.at(-1).target=2;
 applyEffect(g.players[2],'charm',2);
 assert.deepEqual(applyHermitEvent(map,g,{id:29,all:false},()=>0).charges.map(c=>c.debtor),[0]);
 assert.equal(g.players[0].effects.some(e=>e.id==='original-17'),false);
});
test('35 original event constructors, masks and timed callbacks match isolated x86',()=>{
 for(const c of fx.constructors){const g=game(),calls=[],e=createHermitEvent(c.id,g,n=>{calls.push(n);return c.draw%n;});const def=HERMIT_EVENTS[c.id];
  assert.deepEqual(calls,c.draws);assert.equal(e.all,c.all,`${c.id} ${c.draw}`);if(c.item!==undefined)assert.equal(e.item,c.item);if(c.rate!==undefined)assert.equal(e.rate,c.rate);
  for(const key of ['good','duration','mask','value','compensation'])assert.equal(def[key],c[key],`${c.id} ${key}`);
  for(const mask of c.capabilities){const p=g.players[0];p.effects=[];p.events=[{id:c.id,remaining:Math.max(1,c.duration)}];assert.equal(effectCapabilities(p,mask.base),mask.value);}
  if(c.ticks){const p=g.players[0];p.events=[{id:c.id,remaining:c.duration}];for(const tick of c.ticks){p.effectTickPending=true;tickPlayerEffects(p);assert.equal(p.events.length>0,tick.alive);assert.equal(p.events[0]?.remaining??0,tick.remaining);}}
 }
});
test('hermit odds use the original 667 threshold and persistent good/bad capability overrides',()=>{
 const p=game().players[0];assert.equal(hermitGood(p,()=>666),false);assert.equal(hermitGood(p,()=>667),true);
 applyEffect(p,'charm');assert.equal(hermitGood(p,()=>{throw Error('must not draw');}),true);
 p.effects=[];p.events=[{id:23,remaining:5}];assert.equal(hermitGood(p,()=>{throw Error('must not draw');}),false);
});
test('mini selection rejects used IDs, persists the mask and resets after all eight',()=>{
 const g=game(),draws=[3,3,0,0,1,2,4,5,6,7,3];const result=[];for(let n=0;n<9;n++)result.push(selectMiniGame(g,()=>draws.shift()));
 assert.deepEqual(result,[3,0,1,2,4,5,6,7,3]);assert.equal(g.miniPlayed,8);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
test('all supplied eligible hermit branches mutate valid saved state without a fixed cash fallback',()=>{
 for(let id=0;id<35;id++)for(const all of [false,true]){const g=game(),lots=map.cells.flatMap((c,i)=>c.event===1?[i]:[]);let n=0;
  for(let i=0;i<4;i++){g.players[i].inventory=['original-33','original-1','air'];for(let j=0;j<3;j++){const lot=lots[n++];g.owners[lot]=i;g.levels[lot]=j+1;g.kinds[lot]=j+1;}}
  if(id===10){applyEffect(g.players[1],'air',0,false);}
  const draw=n=>E.random(g,n),e={...createHermitEvent(id,g,draw),all};
  if(!prepareHermitEvent(map,g,e,draw)){assert.ok([33].includes(id),`ineligible ${id}`);continue;}
  const r=applyHermitEvent(map,g,e,draw);assert.equal(typeof r.text,'string',`text ${id}`);assert.ok(r.text.length);
  g.queue=r.charges;g.phase='resolving';assert.deepEqual(E.restore(map,JSON.stringify(g)),g,`save ${id}`);
 }
});
test('chest selection and result acknowledgement replay across cold saves without a second payout',()=>{
 for(let seed=1;seed<=150;seed++){const initial=game();initial.seed=seed;initial.phase='prompt';initial.pending={kind:'hermit'};
  const commands=[{type:'answer',action:'chest',value:seed%3},{type:'answer',action:'ok'}];let g=executeCommand(map,initial,commands[0]).state;
  assert.deepEqual(E.restore(map,JSON.stringify(g)),g);g=executeCommand(map,g,commands[1]).state;
  assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
 }
});
test('sleep and movement prohibition expire before action, double action does not tick twice',()=>{
 const g=game(),p=g.players[0];attachHermitEvent(p,{id:21},g,0);assert.equal(E.beginTurn(g),false);assert.equal(p.itemSleeping,true);
 p.effectTickPending=true;p.events[0].remaining=1;g.phase='ready';g.queue=[];assert.equal(E.beginTurn(g),true);assert.equal(p.itemSleeping,false);
 attachHermitEvent(p,{id:1},g,0);g.phase='end';E.nextTurn(map,g);assert.equal(g.turn,0);assert.equal(g.eventExtra,true);E.beginTurn(g);assert.equal(p.events[0].remaining,5);
 g.phase='end';E.nextTurn(map,g);assert.equal(g.turn,1);assert.equal(g.eventExtra,false);
});
