import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {nextCircleReward,originalCircleFine,accrueRentPool} from '../app/src/board-events.mjs';
import {applyEffect,canCollectRent,canVisitShop,affectedByHermit,protectedFromFine} from '../app/src/effects.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),fixture=read('fixtures/original-board-events.json'),map=read('../app/public/assets/maps/4.json');
const game=()=>E.createGame(map,{startDate:'2000-05-02'});
const event=(g,event)=>{g.phase='resolving';g.pending=null;g.queue=[{kind:'event',event}];E.advance(map,g);};
test('circle rewards, fines and the rent pool agree with original instruction slices',()=>{
  for(const c of fixture.rewards){const result=nextCircleReward(c.next,c.triple);assert.equal(result.next,c.after);assert.equal(Math.fround(1000.25+result.amount),c.cash);}
  for(const c of fixture.fines){const amount=originalCircleFine(c.draw,c.protected,c.multiplier);assert.equal(Math.fround(1000.25-amount),c.cash);assert.equal(Math.fround(123.5+amount),c.pool);}
  for(const c of fixture.rents){assert.equal(accrueRentPool(123.5,c.amount),c.pool);assert.equal(Math.fround(1000.25-c.amount),c.payer);assert.equal(Math.fround(500.5+c.amount),c.owner);}
});
test('reward circle cycles globally; rent pool and fine pool remain independent through reload',()=>{
  let g=game();
  for(let i=0;i<11;i++){const before=g.players[g.turn].cash;event(g,10);assert.equal(g.players[g.turn].cash-before,(i%9+1)*50);g=E.restore(map,JSON.stringify(g));g.turn=(g.turn+1)%4;}
  g.pool=75.5;g.rentPool=127.25;const balances=g.players.map(p=>p.cash);event(g,13);
  assert.equal(g.rentPool,0);assert.equal(g.pool,75.5);g.players.forEach((p,i)=>assert.equal(p.cash,balances[i]+(i===g.turn?127.25:0)));
  event(g,12);assert.equal(g.pool,0);assert.equal(g.players[g.turn].cash,balances[g.turn]+202.75);
});
test('protective items affect owner collection, fine circles, hermit and shop with original capability masks',()=>{
  for(const id of ['original-11','original-29']){const g=game();applyEffect(g.players[0],id);assert.equal(canCollectRent(g.players[0]),false);}
  for(const id of ['original-20','original-23','original-31']){const g=game();applyEffect(g.players[0],id);assert.ok(protectedFromFine(g.players[0]));const seed=g.seed;event(g,11);assert.equal(g.players[0].cash,1000);assert.equal(g.pool,0);assert.equal(g.seed,seed);assert.equal(g.pending.kind,'notice');}
  for(const id of ['original-22','original-23']){const g=game();applyEffect(g.players[0],id);const seed=g.seed;assert.equal(affectedByHermit(g.players[0]),false);event(g,14);assert.equal(g.pending.kind,'notice');assert.equal(g.seed,seed);}
  const g=game();applyEffect(g.players[0],'original-23');assert.equal(canVisitShop(g.players[0]),false);
  const shop=map.cells.findIndex(c=>c.event===5),road=E.adjacent(map,shop).find(i=>E.walkable(map.cells[i]));g.players[0].at=road;g.phase='prompt';g.pending={kind:'shop',lot:shop};
  assert.throws(()=>E.answer(map,g,'buy','air'),/商店/);E.answer(map,g,'leave');assert.equal(g.phase,'resolving');
});
test('rent enters its separate pool once even while debt remains unresolved across reload',()=>{
  let g=game();g.players[0].cash=0;g.phase='resolving';g.queue=[{kind:'charge',amount:127.25,creditor:1,rent:true,text:'租金'}];
  E.advance(map,g);assert.equal(g.rentPool,127.25);assert.equal(g.pending.kind,'debt');
  g=E.restore(map,JSON.stringify(g));E.answer(map,g,'withdraw');E.answer(map,g,'pay');E.advance(map,g);assert.equal(g.rentPool,127.25);assert.equal(g.players[1].cash,1127.25);
  const older=game();delete older.rentPool;delete older.rewardNext;older.ruleset='town-flow-11';const upgraded=E.restore(map,JSON.stringify(older));assert.equal(upgraded.rentPool,0);assert.equal(upgraded.rewardNext,50);
});
