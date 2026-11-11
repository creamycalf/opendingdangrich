import {reachLandingCharge} from './arrival-helper.mjs';
import {originalLandItemNeighbor} from '../app/src/land-items.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gameRoadPlacement} from '../app/src/road-items.mjs';
import * as E from '../app/src/engine.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/town.json',import.meta.url)));
map.jail=JSON.parse(fs.readFileSync(new URL('../app/public/assets/flow-assets.json',import.meta.url))).jail;
const newGame=(extra={})=>E.createGame(map,{seed:72,startDate:'2000-04-01',...extra});
const clone=g=>E.restore(map,JSON.stringify(g));
test('town start heading excludes reverse before the first step',()=>{
  const g=newGame();g.turn=1;const p=g.players[1];
  assert.deepEqual([map.cells[p.at].x,map.cells[p.at].y,p.direction],[24,24,0]);
  assert.deepEqual(E.choices(map,g).map(i=>[map.cells[i].x,map.cells[i].y]).sort(),[[23,24],[24,23],[25,24]].sort());
  assert.deepEqual(E.choices(map,clone(g)),E.choices(map,g));
});
function tick(g){
  if(g.phase==='ready'){if(E.beginTurn(g))E.roll(g);}
  else if(g.phase==='moving'&&g.dicePending)g.dicePending=false;
  else if(g.phase==='moving'){const ns=E.choices(map,g);assert.ok(ns.length);E.step(map,g,E.aiDirection(map,g));}
  else if(g.phase==='landed')E.landing(map,g);
  else if(g.phase==='resolving')E.advance(map,g);
  else if(g.phase==='prompt'&&g.pending.kind==='minigame'&&g.pending.session.stage==='playing')E.miniTick(g,[0,0,0,0]);
  else if(g.phase==='prompt')E.answer(map,g,...E.aiAnswer(map,g));
  else if(g.phase==='end')E.nextTurn(map,g);
}
function resolve(g){for(let i=0;i<100&&g.phase==='resolving';i++)E.advance(map,g);}
function location(event){const lot=map.cells.findIndex(c=>c.event===event&&E.adjacent(map,c.y*map.width+c.x).some(n=>E.walkable(map.cells[n])));return {lot,road:E.adjacent(map,lot).find(n=>E.walkable(map.cells[n]))};}
function promptAt(g,event,kind){const {lot,road}=location(event);g.players[g.turn].at=road;g.phase='prompt';g.pending={kind,lot};return lot;}
test('four distinct roles, original starting balances and valid map starts',()=>{
  const g=newGame();assert.equal(g.players.length,4);assert.equal(g.players.filter(p=>p.control==='ai').length,3);
  assert.ok(g.players.every(p=>p.cash===1000&&p.bank===1000&&E.walkable(map.cells[p.at])));
  const slots=g.players.map(p=>({character:p.character,control:p.control}));slots[3].character='suneo';const h=newGame({players:slots});assert.equal(h.players[3].cash,2000);assert.equal(h.players[3].bank,2000);
  slots[1].character=slots[0].character;assert.throws(()=>newGame({players:slots}));assert.deepEqual(clone(g),g);
});
test('buy, upgrade through five stages and sell use durable choices; no double charge',()=>{
  const g=newGame();const lot=promptAt(g,1,'buy'),cash=g.players[0].cash,price=E.landPrice(map.cells[lot]);
  assert.ok(price<100);E.answer(map,g,'yes');assert.equal(g.players[0].cash,cash-price);assert.throws(()=>E.answer(map,g,'yes'));
  let previousRent=E.rent(map,g,lot);for(let level=1;level<=4;level++){g.phase='prompt';g.pending={kind:'upgrade',lot};const restored=clone(g);const before=g.players[0].cash,cost=E.upgradeCost(map,g,lot);E.answer(map,g,'yes');E.answer(map,restored,'yes');assert.deepEqual(g,restored);assert.equal(g.players[0].cash,before-cost);assert.equal(g.levels[lot],level);assert.ok(E.rent(map,g,lot)>previousRent);previousRent=E.rent(map,g,lot);}
});
test('passing property is free; stopping pays rent once and restore does not repeat it',()=>{
  const g=newGame(),{lot,road}=location(1);g.owners[lot]=1;g.levels[lot]=2;const from=E.neighbors(map,road)[0];g.players[0].character='dorami';g.players[0].name='哆啦美';g.players[0].at=from;g.players[0].previous=-1;g.phase='moving';g.remaining=2;
  // Position the actor facing the tested rent cell, rather than retaining the
  // unrelated spawn heading after moving the fixture to another road.
  const a=map.cells[from],b=map.cells[road];g.players[0].direction=b.x>a.x?3:b.x<a.x?2:b.y>a.y?1:0;
  const total=g.players.reduce((n,p)=>n+p.cash+p.bank,0),before=g.players[1].cash;E.step(map,g,road);resolve(g);assert.equal(g.phase,'moving');assert.equal(g.players[1].cash,before);assert.equal(g.players.reduce((n,p)=>n+p.cash+p.bank,0),total);
  // Model this same square as the final dice stop, then use the real landing queue.
  g.remaining=0;g.phase='landed';reachLandingCharge(map,g);const saved=clone(g);resolve(g);resolve(saved);assert.deepEqual(g,saved);assert.equal(g.players[1].cash,before+E.rent(map,g,lot));assert.equal(g.players.reduce((n,p)=>n+p.cash+p.bank,0),total);

});
test('debt can be paid with bank and property sale; bankruptcy skips the player',()=>{
  const g=newGame();const lot=promptAt(g,1,'buy');E.answer(map,g,'yes');g.players[0].cash=0;g.players[0].bank=5;
  const amount=5+E.saleValue(map,g,lot);g.phase='prompt';g.pending={kind:'debt',amount,creditor:1,text:'租金'};
  assert.throws(()=>E.answer(map,g,'bankrupt'));E.answer(map,g,'withdraw');E.answer(map,g,'sell',lot);assert.deepEqual(clone(g),g);const before=g.players[1].cash;E.answer(map,g,'pay');assert.equal(g.players[1].cash,before+amount);assert.equal(g.players[0].cash,0);assert.throws(()=>E.answer(map,g,'pay'));
  g.phase='prompt';g.pending={kind:'debt',amount:1,creditor:1,text:'租金'};E.answer(map,g,'bankrupt');assert.ok(g.players[0].eliminated);resolve(g);E.nextTurn(map,g);assert.equal(g.turn,1);
});
test('last survivor gets a result and a short game can finish without bankruptcy',()=>{
  const g=newGame();g.players[1].eliminated=true;g.players[2].eliminated=true;g.players[0].cash=0;g.players[0].bank=0;g.phase='prompt';g.pending={kind:'debt',amount:1,creditor:3,text:'租金'};E.answer(map,g,'bankrupt');assert.equal(g.phase,'gameover');assert.deepEqual(g.winners,[3]);assert.deepEqual(clone(g),g);
  const h=newGame({maxRounds:30});h.round=30;h.turn=3;h.phase='end';E.nextTurn(map,h);assert.equal(h.phase,'gameover');assert.ok(h.winners.length);
});
test('shop, bank, inventory and targeted items commit once and remain resumable',()=>{
  const g=newGame();promptAt(g,6,'bank');E.answer(map,g,'deposit',100);assert.equal(g.players[0].cash,900);E.answer(map,g,'withdraw',200);assert.equal(g.players[0].bank,900);assert.deepEqual(clone(g),g);E.answer(map,g,'leave');
  const lot=promptAt(g,5,'shop');const cash=g.players[0].cash;
  assert.throws(()=>E.answer(map,g,'buy','air'),/不出售/);assert.equal(g.players[0].cash,cash);
  E.answer(map,g,'buy','charm');assert.equal(g.players[0].cash,cash-E.itemPrice(map,lot,'charm'));assert.deepEqual(clone(g),g);
  E.answer(map,g,'leave');g.phase='ready';g.seed=1500;g.players[0].inventory.push('air');const count=g.players[0].inventory.length;E.useItem(map,g,'air',1);assert.equal(g.players[1].effects[0].remaining,3);assert.equal(g.players[1].skip,0);assert.equal(g.players[0].inventory.length,count-1);assert.throws(()=>E.useItem(map,g,'air',1));assert.throws(()=>E.roll(g));
  g.phase='ready';const beforeDoor=g.players[0].at,to=map.cells.findIndex((c,i)=>gameRoadPlacement(map,g,i).length);E.useItem(map,g,'door',to);assert.equal(g.players[0].at,beforeDoor);assert.equal(g.roadItems[0].at,to);assert.equal(g.phase,'end');assert.deepEqual(clone(g),g);
});
test('events, hermit choice and extra turns are deterministic through a reload',()=>{
  for(const event of [7,8,9,10,11,12,13,14]){const g=newGame();g.pool=100;g.queue=[{kind:'event',event}];g.phase='resolving';const saved=clone(g);E.advance(map,g);E.advance(map,saved);assert.deepEqual(g,saved);if(g.phase==='prompt'&&g.pending.kind==='hermit'){const lucky=1;E.answer(map,g,'chest',lucky);E.answer(map,saved,'chest',lucky);assert.ok(g.pending.text);assert.deepEqual(g,saved);}assert.deepEqual(clone(g),g);}
  const g=newGame();g.extraTurn=true;g.phase='end';E.nextTurn(map,g);assert.equal(g.turn,0);assert.equal(g.round,1);assert.equal(g.extraTurn,false);
});
test('monthly gift, Sunday rest and character movement limits',()=>{
  const g=newGame({startDate:'2000-04-30'});g.turn=3;g.phase='end';E.nextTurn(map,g);assert.ok(!g.players[1].inventory.includes('air'));g.phase='end';E.nextTurn(map,g);E.beginTurn(g);assert.ok(g.players[1].inventory.includes('air'));
  const h=newGame({startDate:'2000-04-02'});h.turn=2;assert.equal(E.beginTurn(h),false);assert.equal(h.phase,'resolving');
  for(let n=0;n<30;n++){const a=newGame({seed:n});a.turn=3;assert.ok(E.roll(a)<=4);const b=newGame({seed:n});b.players[0].jail=true;assert.ok(E.roll(b)<=3);}
});
test('jail entrance reaches the main road through the one-way blocked gate after reload',()=>{
  const g=newGame();g.phase='resolving';g.queue=[{kind:'event',event:9}];E.advance(map,g);assert.ok(g.players[0].jail);E.answer(map,g,'ok');
  let crossed=false;for(let n=0;n<12&&g.players[0].jail;n++){
    g.phase='moving';g.pending=null;g.queue=[];g.remaining=1;const ns=E.choices(map,g);assert.equal(ns.length,1);const target=ns[0];E.step(map,g,target);if(map.cells[target].flags===0xc5)crossed=true;assert.deepEqual(clone(g),g);
  }
  assert.equal(crossed,true);assert.equal(g.players[0].jail,false);assert.ok(E.neighbors(map,g.players[0].at).length);
  const entry=map.jail.y*map.width+map.jail.x;assert.equal(E.teleportAllowed(map,entry),false);
});
test('corrupt saves cannot inject actions, money, ownership or invalid prompt positions',()=>{
  for(const change of [g=>g.players[0].at=-4,g=>g.players[0].cash=-1,g=>g.players[0].cash=null,g=>g.players[0].inventory=['fake'],g=>g.phase='bogus',g=>g.owners[0]=9,g=>g.remaining=99,g=>g.seed=-1,g=>g.queue=[{kind:'charge',amount:-100,creditor:1}],g=>{g.phase='prompt';g.pending={kind:'buy',lot:0};}]){const g=newGame();change(g);assert.throws(()=>clone(g));}
});
test('complete games from setup to results, resuming every transition without deadlocks',()=>{
  for(const seed of [1,72,987654]){let g=newGame({seed,maxRounds:30});let n=0;for(;n<100000&&g.phase!=='gameover';n++){const restored=clone(g);tick(g);tick(restored);assert.deepEqual(g,restored);assert.ok(g.players.every(p=>p.cash>=0&&p.bank>=0));}assert.ok(n<100000,'flow must terminate');assert.equal(g.phase,'gameover');assert.ok(g.winners.length);}
});

test('fractional original rents survive debt, bank withdrawal and restore without rounding to integers',()=>{
  const g=newGame();g.players[0].cash=10.125;g.players[0].bank=20.875;
  g.phase='prompt';g.pending={kind:'debt',amount:20.25,creditor:1,text:'租金'};
  E.answer(map,g,'withdraw');assert.equal(g.players[0].cash,20.25);assert.equal(g.players[0].bank,10.75);
  const h=clone(g);E.answer(map,g,'pay');E.answer(map,h,'pay');assert.deepEqual(g,h);
  assert.equal(g.players[1].cash,1020.25);assert.equal(g.players[0].cash,0);
  promptAt(g,6,'bank');E.answer(map,g,'withdraw',g.players[0].bank);
  assert.equal(g.players[0].cash,10.75);assert.equal(g.players[0].bank,0);assert.deepEqual(clone(g),g);
});

test('landing at owned property offers upgrade or voluntary sale, including maximum-level buildings',()=>{
  const g=newGame(),{lot,road}=location(1);g.players[0].at=road;g.owners[lot]=0;g.levels[lot]=3;
  g.phase='landed';E.landing(map,g);resolve(g);
  if(g.pending.kind==='destination')E.answer(map,g,'select',lot);
  assert.equal(g.pending.kind,'property');assert.equal(g.pending.lot,lot);
  const upgraded=clone(g);E.answer(map,upgraded,'upgrade');assert.equal(upgraded.levels[lot],4);
  upgraded.phase='landed';E.landing(map,upgraded);resolve(upgraded);
  if(upgraded.pending.kind==='destination')E.answer(map,upgraded,'select',lot);
  assert.equal(upgraded.pending.kind,'property');assert.throws(()=>E.answer(map,upgraded,'upgrade'),/不能继续升级/);
  const restored=clone(upgraded),before=restored.players[0].cash,price=E.saleValue(map,restored,lot);
  E.answer(map,restored,'sell');assert.equal(restored.owners[lot],undefined);assert.equal(restored.levels[lot],undefined);
  assert.equal(restored.players[0].cash,Math.fround(before+price));assert.throws(()=>E.answer(map,restored,'sell'));
  assert.deepEqual(clone(restored),restored);
});

test('old flow saves retain balances and queued amounts when future property formulas change',()=>{
  const g=newGame();g.ruleset='town-flow-2';g.players[0].cash=923;
  g.phase='resolving';g.queue=[{kind:'charge',amount:7,creditor:1,text:'旧存档待支付租金'}];
  const h=clone(g);assert.equal(h.ruleset,E.RULESET);assert.equal(h.players[0].cash,923);
  E.advance(map,h);assert.equal(h.players[0].cash,916);assert.equal(h.players[1].cash,1007);
});

test('connected properties are charged once at the final stop',()=>{
  const g=newGame();let location;
  search:for(let lot=0;lot<map.cells.length&&!location;lot++){
    if(map.cells[lot].event!==1)continue;
    const second=E.adjacent(map,lot).find(i=>map.cells[i].event===1);
    if(second===undefined)continue;
    for(const road of E.adjacent(map,lot).filter(i=>E.walkable(map.cells[i])))for(const from of E.neighbors(map,road)){
      const p=g.players[0],a=map.cells[from],b=map.cells[road];p.at=from;p.previous=-1;p.direction=b.x>a.x?3:b.x<a.x?2:b.y>a.y?1:0;
      if(originalLandItemNeighbor(map,road)===lot&&E.choices(map,g).includes(road)){location={lot,second,road};break search;}
    }
  }
  assert.ok(location);const {lot,second,road}=location;
  g.owners[lot]=1;g.owners[second]=1;g.levels[lot]=0;g.levels[second]=2;
  g.phase='moving';g.remaining=1;E.step(map,g,road);reachLandingCharge(map,g);
  const rents=g.queue.filter(e=>e.kind==='charge'&&e.creditor===1);
  assert.equal(rents.length,1);assert.equal(rents[0].amount,E.rent(map,g,lot));
  const before=g.players[1].cash;E.advance(map,g);assert.equal(g.players[1].cash,before+E.rent(map,g,lot));
  assert.deepEqual(clone(g),g);
});
