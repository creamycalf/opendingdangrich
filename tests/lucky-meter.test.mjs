import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {originalLuckyShot,effectCapabilities,applyEffect} from '../app/src/effects.mjs';
import {applyHermitEvent} from '../app/src/hermit.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const map=read('../app/public/assets/maps/4.json'),fx=read('./fixtures/original-lucky.json');
test('all 1000 original lucky-gun draws preserve the actual executable polarity',()=>{
 for(const c of fx.cases){assert.equal(originalLuckyShot(c.draw),c.good);const p={effects:[{id:'original-12',lucky:c.good}],events:[]};assert.equal(effectCapabilities(p,0),c.value);}
});
test('lucky gun outcome is sampled once, saved and replayed, with its eight-turn lifetime',()=>{
 for(let seed=1;seed<35;seed++){const initial=E.createGame(map,{seed,startDate:'2000-04-03'});initial.players[0].inventory=['original-12'];
  const cmd={type:'useItem',item:'original-12'},g=executeCommand(map,initial,cmd).state,e=g.players[0].effects[0];assert.equal(e.remaining,8);assert.equal(typeof e.lucky,'boolean');
  assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[cmd]}),g);
 }
});
test('bad-luck meter pays event-specific inflation-scaled compensation and retains the harmful event',()=>{
 const g=E.createGame(map,{startDate:'2000-04-03'}),p=g.players[0];g.inflation=Math.fround(1.2);applyEffect(p,'original-34');
 const before=p.cash;applyHermitEvent(map,g,{id:16,all:false},()=>0);assert.equal(p.cash,Math.fround(before+Math.fround(1000*g.inflation)));assert.equal(effectCapabilities(p)&4,0);
 const cash=p.cash,r=applyHermitEvent(map,g,{id:25,all:false},()=>0);assert.equal(p.cash,Math.fround(cash+Math.fround(800*g.inflation)));assert.equal(r.charges.length,1);assert.equal(r.charges[0].amount,Math.trunc(500*g.inflation));
 assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
