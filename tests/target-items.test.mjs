import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';
import {applyEffect,tickPlayerEffects,hasEffect,effectApplicationStatus} from '../app/src/effects.mjs';
import {canTakeSleep,canGiveSleep,redirectAttack} from '../app/src/target-items.mjs';
import {applyHermitEvent} from '../app/src/hermit.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
import {itemKey} from '../app/src/inventory.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url)));
const game=()=>E.createGame(map,{startDate:'2000-04-03',players:[{character:'doraemon',control:'human'},{character:'nobita',control:'human'},{character:'shizuka',control:'human'},{character:'gian',control:'human'}]});
function camera(g,holder,target){applyEffect(g.players[holder],'original-7',holder,true,false);g.players[holder].effects.at(-1).target=target;}
function diamond(g,holder,target){applyEffect(g.players[holder],'original-17',holder,true,false);g.players[holder].effects.at(-1).target=target;}
test('legacy target corpus with corrected new PC donor rule and 52 camera cases',()=>{
 const fx=JSON.parse(fs.readFileSync(new URL('./fixtures/original-targets.json',import.meta.url)));
 for(const c of fx.sleep){const g=game(),p=g.players[0],q=g.players[1];p.character=c.nobita?'nobita':'doraemon';q.character=c.shizuka?'shizuka':'gian';q.eliminated=!c.alive;q.itemSleeping=c.sleep;
  if(c.protected)q.events.push({id:7,remaining:5});if(c.army&&!c.stage)q.effects.push({id:'original-14',source:1,remaining:99,active:true});
  const actual=c.stage?canGiveSleep(g,c.sameDonor?1:2,1):canTakeSleep(p,q);assert.equal(actual,c.stage?c.allowed:c.alive&&(c.sleep||c.army),JSON.stringify(c));
 }
 for(const c of fx.reflection){const g=game();camera(g,1,2);g.players[2].eliminated=!c.alive;if(c.protected)g.players[2].events.push({id:7,remaining:5});
  const actual=redirectAttack(g,itemKey(c.id),1,c.id===26?0:-1);assert.equal(actual===2,c.redirected,JSON.stringify(c));assert.equal(!hasEffect(g.players[1],'original-7'),c.consumed,JSON.stringify(c));
 }
});
test('sleep transfer is atomic, wakes donor, attaches five-day sleep and survives replay',()=>{
 let g=game();g.players[0].inventory=['original-26'];applyEffect(g.players[1],'original-4',2,false);g.players[2].effectClockStarted=true;
 const initial=structuredClone(g),cmd={type:'useItem',item:'original-26',target:{donor:1,recipient:2}};
 const bad=structuredClone(cmd);bad.target.recipient=1;assert.throws(()=>executeCommand(map,g,bad));assert.deepEqual(g,initial);
 g=executeCommand(map,g,cmd).state;assert.equal(g.players[1].itemSleeping,false);assert.equal(hasEffect(g.players[1],'original-4'),false);
 assert.equal(g.players[2].itemSleeping,true);assert.equal(g.players[2].effects.at(-1).remaining,6);assert.equal(g.phase,'end');
 assert.deepEqual(E.restore(map,JSON.stringify(g)),g);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[cmd]}),g);
 for(let i=0;i<6;i++){g.players[2].effectTickPending=true;tickPlayerEffects(g.players[2]);}assert.equal(g.players[2].itemSleeping,false);
});
test('camera chooses exactly one redirect; invalid target retains it and swap ignores it',()=>{
 for(const id of ['original-4','original-7','original-15','original-17','original-25','original-26','air','original-39']){
  const g=game();camera(g,1,2);camera(g,2,3);assert.equal(redirectAttack(g,id,1,id==='original-26'?3:-1),2,id);assert.equal(hasEffect(g.players[1],'original-7'),false);assert.equal(hasEffect(g.players[2],'original-7'),true);
 }
 for(const id of ['original-27','original-30','original-33']){const g=game();camera(g,1,2);assert.equal(redirectAttack(g,id,1),1);assert.equal(hasEffect(g.players[1],'original-7'),true);}
 const g=game();camera(g,1,2);applyEffect(g.players[2],'original-19',2);assert.equal(redirectAttack(g,'air',1),1);assert.equal(hasEffect(g.players[1],'original-7'),true);
});
test('camera can return a shot to its caster and clock compensation uses the actual actor',()=>{
 const g=game();g.turn=1;g.players[1].inventory=['air'];g.players[1].effectClockStarted=true;camera(g,3,1);
 const h=executeCommand(map,g,{type:'useItem',item:'air',target:3}).state;
 assert.equal(h.players[1].itemSleeping,true);assert.equal(h.players[1].effects.find(e=>e.id==='air').remaining,3);assert.equal(h.players[3].itemSleeping,false);assert.equal(hasEffect(h.players[3],'original-7'),false);
 assert.deepEqual(E.restore(map,JSON.stringify(h)),h);
});
test('camera and diamond attach to the caster with a durable target, camera has no countdown',()=>{
 for(const id of ['original-7','original-17']){const g=game();g.players[0].inventory=[id];const h=executeCommand(map,g,{type:'useItem',item:id,target:2}).state;
  assert.equal(hasEffect(h.players[0],id),true);assert.equal(hasEffect(h.players[2],id),false);assert.equal(h.players[0].effects[0].target,2);assert.deepEqual(E.restore(map,JSON.stringify(h)),h);
  if(id==='original-7'){for(let i=0;i<20;i++){h.players[0].effectTickPending=true;tickPlayerEffects(h.players[0]);}assert.equal(h.players[0].effects[0].remaining,10);}
  for(const bad of [undefined,-1,4,1.5]){const corrupted=structuredClone(h);corrupted.players[0].effects[0].target=bad;assert.throws(()=>E.restore(map,JSON.stringify(corrupted)));}
 }
});
test('diamond redirects eligible bad events, consumes on failed redirect, and ignores global events',()=>{
 let g=game();diamond(g,0,1);g.players[1].effectClockStarted=true;applyHermitEvent(map,g,{id:21,all:false},()=>0);
 assert.equal(g.players[0].itemSleeping,false);assert.equal(g.players[1].itemSleeping,true);assert.equal(g.players[1].events[0].remaining,5);assert.equal(hasEffect(g.players[0],'original-17'),false);
 g=game();diamond(g,0,1);applyEffect(g.players[1],'charm',1);applyHermitEvent(map,g,{id:21,all:false},()=>0);assert.equal(g.players[0].itemSleeping,true);assert.equal(g.players[1].itemSleeping,false);assert.equal(hasEffect(g.players[0],'original-17'),false);
 g=game();diamond(g,0,1);applyHermitEvent(map,g,{id:25,all:true},()=>0);assert.equal(hasEffect(g.players[0],'original-17'),true);
});
test('new PC permits Nobita to wake Shizuka but still forbids putting her to sleep',()=>{
 const g=game();g.turn=1;const q=g.players[2];applyEffect(q,'original-4',3,false);assert.equal(canTakeSleep(g.players[1],q),true);assert.equal(canGiveSleep(g,3,2),false);
 g.turn=0;q.events.push({id:7,remaining:5});assert.equal(canTakeSleep(g.players[0],q),true);assert.equal(canGiveSleep(g,3,2),false);
});
test('Nobita can transfer Shizuka sleep to Gian through the real item command and save/replay',()=>{
 const g=game();g.turn=1;g.players[1].inventory=['original-26'];applyEffect(g.players[2],'original-4',3,false);
 const cmd={type:'useItem',item:'original-26',target:{donor:2,recipient:3}},after=executeCommand(map,g,cmd).state;
 assert.equal(after.players[2].itemSleeping,false);assert.equal(after.players[3].itemSleeping,true);assert.deepEqual(after.players[1].inventory,[]);
 assert.deepEqual(E.restore(map,JSON.stringify(after)),after);assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial:g,commands:[cmd]}),after);
});
