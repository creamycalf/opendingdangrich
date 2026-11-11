import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {movementDirectionMask} from '../app/src/navigation.mjs';import {originalLandItemNeighbor} from '../app/src/land-items.mjs';import {cloneNodes} from '../app/src/clones.mjs';import {applyEffect} from '../app/src/effects.mjs';import {encounterCharges} from '../app/src/encounters.mjs';import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const maps=Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${i}.json`,import.meta.url)))),map=maps[4];
import {armMovementHermit,movementHermit} from '../app/src/movement-hermit.mjs';import {mapRegion,insideRegion} from '../app/src/map-regions.mjs';import {specialRegionPoint} from '../app/src/special-regions.mjs';
test('random roadside hermit requires both original probability gates and one encounter per turn',()=>{
 const g=E.createGame(map);g.remaining=2;armMovementHermit(g,()=>900);assert.equal(g.hermitArmed,false);assert.equal(movementHermit(g,false,()=>assert.fail('unarmed draw')),false);
 armMovementHermit(g,()=>901);assert.equal(g.hermitArmed,true);assert.equal(movementHermit(g,false,()=>900),false);assert.equal(movementHermit(g,false,()=>901),true);
 for(const prop of ['jail','seen','road','last']){g.players[0].jail=prop==='jail';g.hermitSeen=prop==='seen';g.remaining=prop==='last'?0:2;assert.equal(movementHermit(g,prop==='road',()=>assert.fail('ineligible draw')),false);}
});
test('both composite maps allow only a small poorest player into the special area and preserve an exit after save',()=>{
 for(const b of maps.slice(6)){
  const g=E.createGame(b),p=g.players[0],r=mapRegion(b,1),at=b.cells.findIndex(c=>E.walkable(c)&&insideRegion(r,c.x,c.y));assert.ok(at>=0);p.at=at;p.small=true;applyEffect(p,'original-39',1,false);p.cash=1;p.bank=0;g.phase='landed';E.landing(b,g);
  const entry=specialRegionPoint(b),exit=specialRegionPoint(b,true);assert.equal(p.at,entry.y*b.width+entry.x);assert.equal(p.small,false);assert.equal(p.bonusArea,true);assert.equal(p.effects.some(e=>e.id==='original-39'),false);assert.deepEqual(E.restore(b,JSON.stringify(g)),g);
  p.at=exit.y*b.width+exit.x;g.phase='landed';E.landing(b,g);assert.equal(p.bonusArea,false);assert.notEqual(p.at,exit.y*b.width+exit.x);assert.equal(b.cells[p.at].event,0);assert.deepEqual(E.restore(b,JSON.stringify(g)),g);
  const rich=E.createGame(b);rich.players[0].at=at;rich.players[0].small=true;rich.players[0].cash=100000;rich.phase='landed';E.landing(b,rich);assert.equal(rich.players[0].at,at);assert.equal(rich.players[0].bonusArea,undefined);
 }
});
test('movement wrapper agrees with 28104 original x86 turn-distance and jail-region results',()=>{
 const fx=JSON.parse(fs.readFileSync(new URL('./fixtures/original-turn-navigation.json',import.meta.url)));
 for(const [m,at,d,straightDistance,jail,mask] of fx.rows){const b=maps[m],free=(x,y)=>x>=0&&y>=0&&x<b.width&&y<b.height&&E.walkable(b.cells[y*b.width+x]);assert.equal(movementDirectionMask(b,{at,direction:d,straightDistance,jail},free),mask,JSON.stringify([m,at,d,straightDistance,jail]));}
});
test('each original jail route crosses its gate and exits without the old free-turn heuristic',()=>{
 for(const b of maps){
  const g=E.createGame(b,{startDate:'2000-05-02'}),p=g.players[0];p.at=b.jail.y*b.width+b.jail.x;p.direction=b.jail.direction;p.jail=true;p.previous=-1;
  let steps=0;
  while(p.jail&&steps++<200){g.phase='moving';g.remaining=3;g.queue=[];g.pending=null;const exits=E.choices(b,g);assert.ok(exits.length,`map ${b.id}, jail at ${p.at}`);E.step(b,g,exits[0]);assert.deepEqual(E.restore(b,JSON.stringify(g)),g);}
  assert.equal(p.jail,false,`map ${b.id} jail loop at ${p.at}`);
 }
});
test('passing shops and mines preserve remaining dice steps through transactions, save and replay',()=>{
 for(const event of [5,6]){
  let g=E.createGame(map,{startDate:'2000-05-02'}),p=g.players[0],path;
  for(let at=0;at<map.cells.length&&!path;at++)if(E.walkable(map.cells[at])&&map.cells[originalLandItemNeighbor(map,at)]?.event===event){for(const from of E.neighbors(map,at)){p.at=from;const a=map.cells[from],b=map.cells[at];p.direction=b.x>a.x?3:b.x<a.x?2:b.y>a.y?1:0;p.straightDistance=1;if(E.choices(map,g).includes(at)){path={from,to:at};break;}}}
  assert.ok(path);p.at=path.from;g.phase='moving';g.remaining=3;const initial=structuredClone(g),commands=[{type:'step',to:path.to}];g=executeCommand(map,g,commands[0]).state;
  while(g.phase==='resolving'){const c={type:'advance'};commands.push(c);g=executeCommand(map,g,c).state;}
  assert.equal(g.pending.kind,event===5?'shop':'bank');assert.equal(g.remaining,2);assert.equal(g.afterQueue,'moving');assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
  const leave={type:'answer',action:'leave'};commands.push(leave);g=executeCommand(map,g,leave).state;commands.push({type:'advance'});g=executeCommand(map,g,commands.at(-1)).state;
  assert.equal(g.phase,'moving');assert.equal(g.remaining,2);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
 }
});
test('Gian encounters include follower occupancy, exclude flight, and charge each other player once per moving actor',()=>{
 const g=E.createGame(map),p=g.players[0],gian=g.players[3];g.players[1].eliminated=g.players[2].eliminated=true;gian.at=p.at;assert.equal(encounterCharges(map,g).length,1);
 applyEffect(gian,'original-38',3);assert.deepEqual(encounterCharges(map,g),[]);gian.effects=[];
 p.inventory=['original-24'];E.useItem(map,g,'original-24');gian.at=cloneNodes(p)[0].at;const got=encounterCharges(map,g);assert.equal(got.length,1);assert.equal(got[0].creditor,3);
 g.turn=3;p.at=gian.at;assert.equal(encounterCharges(map,g).length,1);applyEffect(p,'original-38',0);assert.deepEqual(encounterCharges(map,g),[]);
});
test('a removed follower cannot activate a stale landing; moved followers use live positions',()=>{
 const g=E.createGame(map),p=g.players[0];p.inventory=['original-24'];E.useItem(map,g,'original-24');g.phase='landed';E.landing(map,g);g.queue.shift();p.effects=[];E.advance(map,g);assert.equal(g.queue.length,0);assert.equal(g.pending,null);
 const h=E.createGame(map),q=h.players[0];q.inventory=['original-24'];E.useItem(map,h,'original-24');h.phase='landed';E.landing(map,h);h.queue.shift();const next=E.neighbors(map,q.at)[0];cloneNodes(q)[0].at=next;E.advance(map,h);assert.equal(h.visitAt,next);assert.deepEqual(E.restore(map,JSON.stringify(h)),h);
});
