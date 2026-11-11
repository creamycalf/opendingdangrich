import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {originalMonthlyGiftIds,itemKey} from '../app/src/inventory.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const fixture=read('./fixtures/original-monthly-gifts.json');
const map=read('../app/public/assets/maps/4.json');
const game=(date='2000-05-01')=>E.createGame(map,{startDate:date});

test('gift dispatch and quantities agree with 432 original x86 cases',()=>{
  assert.equal(fixture.cases.length,432);
  for(const c of fixture.cases){
    const actual=c.before.slice();for(const id of originalMonthlyGiftIds(c.character,c.day,c.cycle))actual[id]++;
    assert.deepEqual(actual,c.after,JSON.stringify([c.character,c.day,c.cycle,c.flags]));
    assert.equal(c.flagsAfter,c.day===1&&c.cycle===0?c.flags&~0x80:c.flags);
  }
  for(const c of fixture.dates){
    const [year,month,day]=c.before,g=game(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`);g.round=2;
    const date=E.dateParts(g);assert.deepEqual([date.year,date.month,date.day],c.after.slice(0,3));assert.equal(c.after[3],0);
  }
});

test('first-day gifts arrive on the recipient turn, before sleep or Sunday rest',()=>{
  const g=game();assert.deepEqual(g.players[1].inventory,[]);assert.deepEqual(g.players[2].inventory,[]);
  E.beginTurn(g);assert.deepEqual(g.players[1].inventory,[]);
  g.phase='end';E.nextTurn(map,g);assert.equal(g.turn,1);assert.deepEqual(g.players[1].inventory,[]);
  E.beginTurn(g);assert.deepEqual(g.players[1].inventory,['air']);assert.equal(g.players[1].lastGiftMonth,'2000-05');
  g.phase='end';E.nextTurn(map,g);E.beginTurn(g);assert.deepEqual(g.players[2].inventory,[itemKey(10),itemKey(19)]);
  const sunday=game('2000-10-01');sunday.turn=2;assert.equal(E.beginTurn(sunday),false);
  assert.equal(sunday.phase,'resolving');assert.deepEqual(sunday.players[2].inventory,[itemKey(10),itemKey(19)]);
  const sleeping=game();sleeping.turn=1;Object.assign(sleeping.players[1],{effects:[{id:'air',source:0,remaining:2}],itemSleeping:true});
  assert.equal(E.beginTurn(sleeping),false);assert.deepEqual(sleeping.players[1].inventory,['air']);
});

test('begin, reload, extra action and replay cannot duplicate a monthly award',()=>{
  const initial=game();initial.turn=1;
  let current=executeCommand(map,initial,{type:'beginTurn'}).state;
  const awarded=structuredClone(current);
  current=E.restore(map,JSON.stringify(current));E.beginTurn(current);assert.deepEqual(current,awarded);
  assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[{type:'beginTurn'},{type:'beginTurn'}]}),awarded);
  current.extraTurn=true;current.phase='end';E.nextTurn(map,current);E.beginTurn(current);
  assert.equal(current.players[1].inventory.length,1);
  current.round=32;E.beginTurn(current);assert.equal(E.dateParts(current).day,1);
  assert.deepEqual(current.players[1].inventory,['air','air']);assert.equal(current.players[1].lastGiftMonth,'2000-06');
});

test('non-first days and eliminated players cannot collect; year rollover permits a new award',()=>{
  const middle=game('2000-05-15');middle.turn=1;E.beginTurn(middle);assert.deepEqual(middle.players[1].inventory,[]);
  const dead=game();dead.turn=1;dead.players[1].eliminated=true;const before=structuredClone(dead);
  assert.throws(()=>executeCommand(map,dead,{type:'beginTurn'}),/破产/);assert.deepEqual(dead,before);
  const year=game('2000-12-31');year.players[1].lastGiftMonth='2000-12';year.round=2;year.turn=1;E.beginTurn(year);
  assert.equal(year.players[1].lastGiftMonth,'2001-01');assert.deepEqual(year.players[1].inventory,['air']);
});

test('legacy saves preserve existing awards; missing markers in new saves are rejected',()=>{
  for(const ruleset of ['town-flow-2','town-flow-3','town-flow-4','town-flow-5','town-flow-6','town-flow-7']){
    const old=game();old.turn=1;old.ruleset=ruleset;old.players[1].inventory=Array(25).fill('air');
    for(const p of old.players)delete p.lastGiftMonth;
    const updated=E.restore(map,JSON.stringify(old));E.beginTurn(updated);
    assert.equal(updated.players[1].inventory.length,25);assert.equal(updated.players[1].lastGiftMonth,'2000-05');
    updated.round=32;E.beginTurn(updated);assert.equal(updated.players[1].inventory.length,26);
  }
  for(const invalid of [undefined,null,1,'2000-00','2000-13','today']){
    const bad=game();bad.players[1].lastGiftMonth=invalid;assert.throws(()=>E.restore(map,JSON.stringify(bad)));
  }
});

test('AI replenishes low inventory and retains a stocked pocket',()=>{
  const g=game(),shop=map.shops[0],lot=shop.y*map.width+shop.x;
  g.phase='prompt';g.pending={kind:'shop',lot};g.players[0].inventory=[];
  const [action,item]=E.aiAnswer(map,g);assert.equal(action,'buy');assert.equal(E.ITEMS[item].implemented,true);g.players[0].inventory=Array(22).fill('original-3');assert.equal(E.aiAnswer(map,g)[0],'leave');
});
