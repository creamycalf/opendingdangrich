import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {monthlyAward,accrueInterest,inflate,settleMonthly} from '../app/src/monthly.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const map=read('../app/public/assets/maps/4.json'),fx=read('./fixtures/original-monthly.json');
test('monthly calculation, eligibility and step reset match original x86',()=>{
 for(const c of fx.cases)for(let i=0;i<4;i++){
  const p=c.players[i],eligible=!p.eliminated&&(c.converter<0?!p.claimed:i===c.converter);
  const lots=p.lots.map(([lot,level,kind])=>({price:map.cells[lot].price,level,kind}));
  const r=monthlyAward(lots,p.steps,p.interest,c.multiplier,eligible);
  assert.equal(p.eliminated?0:r.total,c.rewards[i],JSON.stringify([c.multiplier,c.converter,i,p.claimed]));
  assert.equal(eligible?0:p.steps,c.steps[i]);
 }
});
test('daily accrual and inflation match original x87 float32 outputs',()=>{
 for(const c of fx.interest){let accrued=0;for(const expected of c.trace){accrued=accrueInterest(c.bank,accrued,c.rate);assert.equal(accrued,expected);}}
 for(const c of fx.inflation)assert.equal(inflate(c.before,c.draw),c.after);
});
test('month end settles once before next action; confirming and restoring never pays twice',()=>{
 const initial=E.createGame(map,{startDate:'2000-04-30'});initial.turn=3;initial.phase='end';
 const lot=map.cells.findIndex(c=>c.event===1);initial.owners[lot]=0;initial.levels[lot]=4;initial.players[0].walkPoints=12;
 const commands=[{type:'nextTurn'},{type:'answer',action:'ok'}];
 let g=executeCommand(map,initial,commands[0]).state;
 assert.equal(g.pending.kind,'monthly');assert.equal(g.phase,'prompt');assert.equal(g.round,2);assert.ok(g.inflation>=1.2&&g.inflation<=1.3);
 assert.equal(g.players[0].walkPoints,0);assert.ok(g.players[0].bank>1000);assert.ok(g.players[0].cash>1120);assert.equal(g.players[0].interest,0);
 assert.deepEqual(E.restore(map,JSON.stringify(g)),g);const cash=g.players.map(p=>p.cash);
 g=executeCommand(map,g,commands[1]).state;assert.equal(g.phase,'ready');assert.deepEqual(g.players.map(p=>p.cash),cash);
 assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
 assert.equal(E.landPrice(map.cells[lot],g),Math.trunc(map.cells[lot].price*g.inflation));
});
test('date converter consumes one turn, retains date and interest, and rejects repeats without consuming inventory',()=>{
 let g=E.createGame(map,{startDate:'2000-04-29'});g.players[0].inventory=['original-5','original-5'];g.players[0].walkPoints=15;g.players[0].interest=4;
 g=executeCommand(map,g,{type:'useItem',item:'original-5'}).state;
 assert.equal(g.round,1);assert.equal(g.inflation,1);assert.equal(g.players[0].cash,1154);assert.equal(g.players[0].walkPoints,0);assert.equal(g.players[0].interest,4);assert.equal(g.pending.resume,'end');
 assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
 g=executeCommand(map,g,{type:'answer',action:'ok'}).state;assert.equal(g.phase,'end');g.phase='ready';
 const before=structuredClone(g);assert.throws(()=>executeCommand(map,g,{type:'useItem',item:'original-5'}),/这个月/);assert.deepEqual(g,before);
 g.players[0].walkPoints=3;const rows=settleMonthly(map,g);assert.equal(rows[0].walking,0);assert.equal(rows[0].property,0);assert.equal(g.players[0].walkPoints,3);assert.equal(g.players[0].bank,1004);assert.equal(g.players[0].cash,1154);assert.equal(g.players[0].monthlyClaimed,false);
});
test('steps accrue through movement, enter net worth, and migrate old balances without inventing history',()=>{
 const g=E.createGame(map);g.phase='moving';g.remaining=1;const before=E.netWorth(map,g,0);const to=E.choices(map,g)[0];E.step(map,g,to);assert.equal(g.players[0].walkPoints,1);assert.equal(E.netWorth(map,g,0),before+1);
 const old=E.createGame(map);old.ruleset='town-flow-21';delete old.inflation;delete old.interestRate;for(const p of old.players){delete p.interest;delete p.walkPoints;delete p.monthlyClaimed;}
 const restored=E.restore(map,JSON.stringify(old));assert.equal(restored.inflation,1);assert.equal(restored.players[0].walkPoints,0);assert.equal(restored.players[0].cash,old.players[0].cash);
 for(const key of ['interest','walkPoints','monthlyClaimed']){const bad=structuredClone(restored);delete bad.players[0][key];assert.throws(()=>E.restore(map,JSON.stringify(bad)));}
});
