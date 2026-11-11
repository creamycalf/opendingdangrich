import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {EFFECTS,tickPlayerEffects,applyEffect,hasEffect,originalAirHit,originalAttachmentCount} from '../app/src/effects.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const map=read('../app/public/assets/maps/4.json');
const game=()=>E.createGame(map,{startDate:'2000-04-03'});
const remaining=(p,id)=>p.effects.find(e=>e.id===id)?.remaining;
test('effect clocks match original turn flag paths and item callbacks',()=>{
  const fixture=read('./fixtures/original-effect-clock.json');
  const constructors=read('../research/original-item-constructors.json').items;
  for(const effect of Object.values(EFFECTS))assert.equal(parseInt(constructors[effect.originalId].rawFields['0x70']),effect.duration);
  for(const c of fixture.cases){
    const key=c.item===28?'charm':'air',p={effects:[{id:key,source:0,remaining:c.remaining}],effectTickPending:c.pending};
    const events=[];let remaining=c.remaining,expired=false;
    for(const expected of c.sequence){
      if(expected.action==='end')p.effectTickPending=true;
      else if(tickPlayerEffects(p).includes(key)){
        remaining=0;expired=true;if(key==='air')events.push('wake');events.push('expired');
      }
      if(hasEffect(p,key))remaining=p.effects.find(e=>e.id===key).remaining;
      assert.deepEqual({action:expected.action,remaining,pending:p.effectTickPending,expired,events},expected);
    }
  }
});
test('charm lasts across chest choices and expires once at its fifth armed start',()=>{
  const g=game(),p=g.players[0];E.useItem(map,g,'charm');assert.equal(remaining(p,'charm'),5);
  for(let n=0;n<2;n++){
    g.phase='prompt';g.pending={kind:'hermit',lucky:0};const before=p.cash;
    E.answer(map,g,'chest',2);assert.ok(p.cash>=before);assert.equal(g.queue.some(e=>e.kind==='charge'),false);assert.equal(remaining(p,'charm'),5);
  }
  for(let n=4;n>=0;n--){
    p.effectTickPending=true;g.phase='ready';g.pending=null;
    assert.equal(E.beginTurn(g),true);assert.equal(remaining(p,'charm'),n||undefined);
    const saved=JSON.stringify(g);assert.equal(E.beginTurn(g),true);assert.equal(JSON.stringify(g),saved);
    const resumed=E.restore(map,saved);assert.equal(E.beginTurn(resumed),true);assert.deepEqual(resumed,g);
  }
});
test('air sleep honors whether target has ended an earlier turn and wakes before action',()=>{
  for(const [alreadyActed,clockStarted,expectedSleeps] of [[false,false,3],[true,false,2],[true,true,3]]){
    const g=game(),target=g.players[1];g.seed=1500;target.effectTickPending=alreadyActed;target.effectClockStarted=clockStarted;g.players[0].inventory=['air'];
    E.useItem(map,g,'air',1);assert.equal(remaining(target,'air'),clockStarted?4:3);assert.equal(target.skip,0);
    E.nextTurn(map,g);let sleeps=0;
    for(let i=0;i<4;i++){
      if(E.beginTurn(g))break;
      sleeps++;assert.equal(g.phase,'resolving');assert.ok(hasEffect(target,'air'));
      // The end and return of this player's normal turn, without simulating unrelated map events.
      g.phase='end';E.nextTurn(map,g);g.turn=1;g.phase='ready';g.queue=[];
    }
    assert.equal(sleeps,expectedSleeps);assert.equal(remaining(target,'air'),undefined);assert.equal(g.phase,'ready');
    assert.ok(g.log.some(e=>e.text.includes('空气枪已结束')));
  }
});
test('extra actions do not arm another effect tick; commands and checkpoints replay',()=>{
  const initial=game();applyEffect(initial.players[0],'charm');initial.phase='end';initial.extraTurn=true;
  const record={format:'dingdang-replay-v1',initial:structuredClone(initial),commands:[]};let state=initial;
  for(const command of [{type:'nextTurn'},{type:'beginTurn'},{type:'roll'},{type:'dicePresented'}]){
    record.commands.push(command);state=executeCommand(map,state,command).state;
    assert.deepEqual(E.restore(map,JSON.stringify(state)),state);
  }
  assert.equal(remaining(state.players[0],'charm'),5);assert.deepEqual(replayCommands(map,record),state);
});
test('invalid effect saves are rejected; legacy single-use charm and skip are preserved',()=>{
  for(const effects of [{air:0},[{id:'charm',remaining:7,source:0}],[{id:'air',remaining:1.5,source:0}],[{id:'unknown',remaining:3,source:0}],null]){
    const g=game();g.players[0].effects=effects;assert.throws(()=>E.restore(map,JSON.stringify(g)));
  }
  const bad=game();bad.players[0].effectTickPending=1;assert.throws(()=>E.restore(map,JSON.stringify(bad)));
  const old=game();old.ruleset='town-flow-4';old.players[0].charm=true;old.players[1].skip=1;
  for(const p of old.players){delete p.effects;delete p.effectTickPending;delete p.effectClockStarted;delete p.itemSleeping;}
  const migrated=E.restore(map,JSON.stringify(old));assert.equal(migrated.ruleset,E.RULESET);
  assert.deepEqual(migrated.players[0].effects,[]);assert.equal(migrated.players[0].charm,true);assert.equal(migrated.players[1].skip,1);
});
test('air-gun threshold and attachment compensation agree with original instructions',()=>{
  const fixture=read('./fixtures/original-effect-clock.json');
  for(const c of fixture.shots){assert.equal(originalAirHit(c.expert,c.random),c.hit);assert.equal(c.randomCalls,c.expert?0:1);}
  for(const c of fixture.attachments)assert.equal(originalAttachmentCount(c.initial,!!(c.flags&0x2000),!!(c.flags&0x4000)),c.remaining);
});
test('miss consumes the shot without sleep; Nobita hits without consuming random state',()=>{
  const g=game();g.players[0].inventory=['air'];g.seed=72;const seed=g.seed;E.useItem(map,g,'air',1);
  assert.equal(g.players[0].inventory.length,0);assert.equal(g.players[1].itemSleeping,false);assert.equal(g.phase,'end');assert.notEqual(g.seed,seed);
  const h=game();h.turn=1;h.players[1].inventory=['air'];const before=h.seed;
  E.useItem(map,h,'air',3);assert.equal(h.seed,before);assert.equal(h.players[3].itemSleeping,true);
});
test('same caster cannot refresh an active effect; separate casters retain independent clocks',()=>{
  for(const c of read('./fixtures/original-effect-clock.json').conflicts)assert.equal(c.result,c.sameSource?3:1);
  const p=game().players[0];applyEffect(p,'air',1,false);assert.throws(()=>applyEffect(p,'air',1,false),/已经/);
  p.effects[0].remaining=1;applyEffect(p,'air',2,false);p.effectTickPending=true;
  assert.deepEqual(tickPlayerEffects(p),['air']);assert.equal(p.effects.length,1);assert.equal(p.effects[0].remaining,2);
  // 0x49e956 wakes unconditionally when its own timer expires, even when a
  // different caster's air-gun object is still attached.
  assert.equal(p.itemSleeping,false);
});
