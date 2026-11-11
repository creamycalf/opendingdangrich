import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {pcPropertyPayment,nextCashDebtDays,cashAtRefresh} from '../app/src/pc-economy.mjs';
import {bankTransfer} from '../app/src/bank-transfer.mjs';
import {inflate,inflateV126,settleMonthly} from '../app/src/monthly.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/4.json',import.meta.url)));
const credit=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-credit.json',import.meta.url)));
const transactions=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-property-transactions.json',import.meta.url)));
const bounds=JSON.parse(fs.readFileSync(new URL('../research/pc-v126-economy-bounds.json',import.meta.url)));
const lot=map.cells.findIndex(c=>c.event===1&&c.price>0);
const visit=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));
test('v1.26 inflation and cash refresh match original x87 instructions; old saves retain old inflation',()=>{
  for(const [before,draw,after] of bounds.inflation)assert.equal(inflateV126(before,draw),after);
  for(const [before,after] of bounds.cash)assert.equal(cashAtRefresh({pcEconomyVersion:'pc-v126'},before),after);
  for(const native of [true,false]){
    const g=E.createGame(map,{startDate:'2000-01-31'});if(!native)delete g.pcEconomyVersion;
    const rng={seed:g.seed,randomVersion:g.randomVersion},draw=E.random(rng,native?20:10),expected=(native?inflateV126:inflate)(g.inflation,draw);
    g.turn=3;g.phase='end';E.nextTurn(map,g);
    assert.equal(g.inflation,expected);assert.equal(g.seed,rng.seed);assert.equal(g.pending.kind,'monthly');
    assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
  }
});
test('cash cap is applied at active refresh, not every passive credit or month-end payout',()=>{
  const g=E.createGame(map);g.players[0].cash=1000;g.players[1].cash=999950;
  g.phase='resolving';g.queue=[{kind:'charge',amount:100,creditor:1,text:'租金',rent:true}];E.advance(map,g);
  assert.equal(g.players[1].cash,1000050);g.phase='ready';g.turn=1;E.beginTurn(g);assert.equal(g.players[1].cash,999999);
  const normal=E.createGame(map);normal.players[0].cash=999900;normal.players[0].walkPoints=100;
  settleMonthly(map,normal);assert.equal(normal.players[0].cash,1000900);E.beginTurn(normal);assert.equal(normal.players[0].cash,999999);
  const early=E.createGame(map);early.players[0].cash=999900;early.players[0].walkPoints=100;settleMonthly(map,early,0);assert.equal(early.players[0].cash,999999);
  const old=E.createGame(map);delete old.pcEconomyVersion;old.players[0].cash=1000000;E.beginTurn(old);assert.equal(old.players[0].cash,1000000);
  const negative=E.createGame(map);negative.players[0].cash=-1000000;E.beginTurn(negative);assert.equal(negative.players[0].cash,-1000000);
});
test('original machine-code debt-day counter and 15-day scheduler threshold',()=>{
  for(const row of credit.counter){const after=nextCashDebtDays(row.cash,row.days);assert.equal(after,row.after);assert.equal(after>=15,row.eliminated);}
  for(const [cash,bank,position,nextCash,nextBank] of credit.bank){const actual=bankTransfer(cash,bank,position);assert.equal(actual.cash,nextCash);assert.equal(actual.bank,nextBank);}
});
test('original human/AI transaction payloads are paid by the engine, including credit and sales',()=>{
  for(const row of transactions.rows){
    const board=structuredClone(map);board.cells[lot].price=row.mapBase;
    const g=E.createGame(board),p=g.players[0],sale=row.kind.toLowerCase().includes('sell'),kind=sale?'sell':row.kind.toLowerCase().includes('buy')?'buy':'upgrade';
    g.inflation=row.multiplier;p.control=row.kind.startsWith('human')?'human':'ai';p.cash=row.cashBefore;
    g.phase='prompt';g.pending={kind:kind==='buy'?'buy':'property',lot};g.visitAt=visit;
    if(kind!=='buy'){g.owners[lot]=0;g.levels[lot]=row.level;g.kinds[lot]=row.level?1:0;}
    const charge=pcPropertyPayment(kind,row.arrivalPayload,row.level??0,row.multiplier,p.control==='ai');
    if(row.charged!==undefined)assert.equal(charge,row.charged);
    E.answer(board,g,kind==='buy'?'yes':kind);
    assert.equal(p.cash,row.cashAfter,JSON.stringify(row));
    assert.deepEqual(E.restore(board,JSON.stringify(g)),g);
  }
});
test('charges create negative cash without emergency withdrawal; day 15 clears property and effects',()=>{
  let g=E.createGame(map),p=g.players[0];p.cash=10;p.bank=9000;
  g.phase='resolving';g.queue=[{kind:'charge',amount:46,creditor:1,text:'租金',rent:true}];
  E.advance(map,g);assert.equal(g.phase,'resolving');assert.equal(p.cash,-36);assert.equal(p.bank,9000);assert.equal(g.players[1].cash,1046);
  g.owners[lot]=0;g.levels[lot]=3;g.kinds[lot]=1;
  for(let day=1;day<=15;day++){
    g.turn=3;g.phase='end';g.queue=[];E.nextTurn(map,g);
    assert.equal(g.players[0].cashDebtDays,day);assert.equal(g.players[0].eliminated,day===15);
    g=E.restore(map,JSON.stringify(g));
  }
  assert.equal(g.owners[lot],undefined);assert.equal(g.players[0].bank,9000);assert.equal(g.players[0].cash,-36);
});
test('daily debt resets at zero, slow-clock extra cycles do not count as days, and all-bankrupt saves restore',()=>{
  let g=E.createGame(map);g.players[0].cash=-1;g.slowDays=3;
  g.turn=3;g.phase='end';E.nextTurn(map,g);assert.equal(g.players[0].cashDebtDays,0);
  g.turn=3;g.phase='end';E.nextTurn(map,g);assert.equal(g.players[0].cashDebtDays,1);
  g.players[0].cash=0;g.slowDays=0;g.turn=3;g.phase='end';E.nextTurn(map,g);assert.equal(g.players[0].cashDebtDays,0);
  for(const p of g.players){p.cash=-1;p.cashDebtDays=14;}
  g.turn=3;g.phase='end';E.nextTurn(map,g);assert.equal(g.phase,'gameover');assert.deepEqual(g.winners,[]);
  assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
test('negative cash bank slider and negative interest survive a month boundary',()=>{
  let g=E.createGame(map,{startDate:'2000-01-31'}),p=g.players[0];
  const bank=map.cells.findIndex(c=>c.event===6),at=E.adjacent(map,bank).find(i=>E.walkable(map.cells[i]));
  g.phase='prompt';g.pending={kind:'bank',lot:bank};g.visitAt=at;p.cash=-100;p.bank=10;
  E.answer(map,g,'bankPosition',0);assert.equal(p.cash,0);assert.equal(p.bank,-90);assert.equal(g.phase,'resolving');
  g=E.restore(map,JSON.stringify(g));g.turn=3;g.phase='end';E.nextTurn(map,g);
  assert.equal(g.pending.kind,'monthly');assert.ok(g.pending.rows[0].interest<0);assert.ok(g.players[0].bank<-90);
  assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
test('old saves retain immediate debt handling and reject negative balances',()=>{
  const g=E.createGame(map);delete g.pcEconomyVersion;for(const p of g.players)delete p.cashDebtDays;
  for(const snapshot of g.history.slots)if(snapshot){delete snapshot.pcEconomyVersion;for(const p of snapshot.players)delete p.cashDebtDays;}
  g.phase='resolving';g.players[0].cash=0;g.queue=[{kind:'charge',amount:10,creditor:1,text:'租金'}];E.advance(map,g);
  assert.equal(g.pending.kind,'debt');assert.equal(g.players[0].cash,0);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
  g.players[0].cash=-1;assert.throws(()=>E.restore(map,JSON.stringify(g)));
});
test('blocked magnet retreat cannot retrigger clone reward and extra-move circles without moving',()=>{
  const board=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps-v126/5.json',import.meta.url))),g=E.createGame(board);
  g.turn=3;g.phase='moving';g.remaining=4;
  Object.assign(g.players[2],{at:1324,direction:0,previous:1374,effects:[{id:'original-3',source:2,remaining:4,target:3}]});
  Object.assign(g.players[3],{at:1374,direction:0,previous:1424,effects:[{id:'original-3',source:2,remaining:4,target:3},{id:'original-24',source:3,remaining:4,nodes:[{at:1424,direction:3},{at:1423,direction:3},{at:1422,direction:3}]}]});
  // RC14 reproduces the native reverse-heading fallback: 1424 is a real
  // retreat, even though the old candidate mask did not contain its bit.
  const native=structuredClone(g),nativeCash=native.players[3].cash;
  const walk=E.step(board,native,1324);assert.equal(walk.direction,1);assert.equal(native.players[3].at,1424);assert.equal(native.remaining,3);assert.equal(native.players[3].cash,nativeCash);
  assert.equal(native.players[3].effects.find(e=>e.id==='original-24').nodes[0].at,1374);
  const oldNavigation=structuredClone(g);delete oldNavigation.pcNavigationVersion;delete oldNavigation.pcNavigationFirst;delete oldNavigation.pcNavigationForced;
  const legacy=structuredClone(oldNavigation);delete legacy.pcEconomyVersion;
  // A physically absent retreat must still terminate rather than re-land
  // in place. Exercise that guard for new navigation as well as old saves.
  const blockedBoard=structuredClone(board);blockedBoard.cells[1424].flags=0;
  for(const [testMap,state] of [[board,oldNavigation],[board,legacy],[blockedBoard,g]]){
    const cash=state.players[3].cash,round=state.round;
    assert.ok(E.choices(testMap,state).includes(1324));E.step(testMap,state,1324);
    E.advance(testMap,state);assert.equal(state.pending.kind,'notice');E.answer(testMap,state,'ok');E.advance(testMap,state);
    assert.equal(state.phase,'end');assert.equal(state.players[3].cash,cash);E.nextTurn(testMap,state);assert.equal(state.round,round+1);
  }
});
