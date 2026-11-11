import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {originalBombDestination} from '../app/src/bomb.mjs';
import * as E from '../app/src/engine.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url))),fixture=read('fixtures/original-bomb.json');
const maps=Array.from({length:8},(_,i)=>read(`../app/public/assets/maps/${i}.json`));
test('bomb destination rejection sampling and new heading match 96 original traces on eight maps',()=>{
  for(const row of fixture.rows){
    const map=maps[row.map],draws=structuredClone(row.draws),result=originalBombDestination(map,row.start.y*map.width+row.start.x,n=>{const d=draws.shift();assert.ok(d);assert.equal(d[0],n);return d[1];});
    assert.deepEqual(result,{to:row.y*map.width+row.x,direction:row.direction});assert.equal(draws.length,0);
  }
});
test('bomb moves to a normal road without invented fine or sleep; additional movement stays in current turn',()=>{
  const map=maps[4];let g=E.createGame(map,{startDate:'2000-05-02'}),p=g.players[0];
  p.jail=true;const before=p.at;g.phase='resolving';g.queue=[{kind:'event',event:8},{kind:'destination'}];E.advance(map,g);
  assert.notEqual(p.at,before);assert.equal(map.cells[p.at].event,0);assert.equal(p.cash,1000);assert.equal(p.skip,0);assert.equal(p.jail,false);assert.equal(g.pool,0);assert.deepEqual(g.queue,[]);
  g=E.restore(map,JSON.stringify(g));g.phase='resolving';g.pending=null;g.queue=[{kind:'event',event:7},{kind:'destination'}];
  const serial=g.turnSerial;E.advance(map,g);assert.equal(g.phase,'moving');assert.ok(g.dice>=1&&g.dice<=6);assert.equal(g.remaining,g.dice);assert.equal(g.dicePending,true);assert.equal(g.extraTurn,false);assert.equal(g.turnSerial,serial);assert.deepEqual(g.queue,[]);
  assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
