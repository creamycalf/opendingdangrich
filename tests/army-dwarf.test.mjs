import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../app/src/engine.mjs';import {applyEffect,hasEffect,effectCapabilities,tickPlayerEffects,sleepSource} from '../app/src/effects.mjs';
import {retaliateRent,transferSleep} from '../app/src/target-items.mjs';import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url)));
const game=()=>E.createGame(map,{startDate:'2000-04-03'});
test('sleep and activated dwarf capabilities match all 24 original x86 samples',()=>{
 const fx=JSON.parse(fs.readFileSync(new URL('./fixtures/original-sleep-capabilities.json',import.meta.url)));
 for(const c of fx.cases){const p={itemSleeping:c.sleep,effects:c.active?[{id:'original-14',source:0,remaining:99,active:true}]:[]};assert.equal(effectCapabilities(p,c.base),c.after,JSON.stringify(c));}
});
test('rent retaliation targets the actual owner, bypasses attack protection and persists through debt',()=>{
 let g=game();g.turn=1;applyEffect(g.players[1],'original-8',1);applyEffect(g.players[2],'original-19',2);g.players[1].cash=0;g.players[2].effectClockStarted=true;
 g.queue=[{kind:'charge',rent:true,debtor:1,creditor:3,armyTarget:2,amount:100,text:'狸猫改变收款人'}];g.phase='resolving';
 const initial=structuredClone(g),commands=[{type:'advance'},{type:'answer',action:'withdraw'},{type:'answer',action:'pay'}];
 for(const c of commands){g=executeCommand(map,g,c).state;assert.deepEqual(E.restore(map,JSON.stringify(g)),g);}
 assert.equal(g.players[2].itemSleeping,true);assert.equal(g.players[3].itemSleeping,false);assert.equal(hasEffect(g.players[1],'original-8'),false);
 assert.deepEqual(g.players[2].effects.find(e=>e.id==='original-42'),{id:'original-42',source:2,remaining:6});assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands}),g);
});
test('army stays when landlord is asleep, and carrying an army is not a sleep flag',()=>{
 const g=game();applyEffect(g.players[0],'original-8');applyEffect(g.players[1],'original-8',1);assert.equal(sleepSource(g.players[1]),false);
 assert.equal(retaliateRent(g,0,1),true);assert.equal(hasEffect(g.players[1],'original-8'),true);
 applyEffect(g.players[0],'original-8');assert.equal(retaliateRent(g,0,1),false);assert.equal(hasEffect(g.players[0],'original-8'),true);
});
test('ordinary rent still triggers the army when the debtor exhausts assets and goes bankrupt',()=>{
 const g=game();g.players[0].cash=g.players[0].bank=0;applyEffect(g.players[0],'original-8');
 g.queue=[{kind:'charge',rent:true,debtor:0,creditor:1,armyTarget:1,amount:100,text:'租金'}];g.phase='resolving';E.advance(map,g);
 E.answer(map,g,'bankrupt');assert.equal(g.players[0].eliminated,true);assert.equal(g.players[1].itemSleeping,true);assert.equal(hasEffect(g.players[0],'original-8'),false);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
test('dwarf waits indefinitely, activates on sleep and is removed when sleep expires',()=>{
 const g=game(),p=g.players[1];applyEffect(p,'original-14',1);for(let n=0;n<12;n++){p.effectTickPending=true;tickPlayerEffects(p);}assert.equal(p.effects[0].remaining,99);assert.equal(p.effects[0].active,false);
 applyEffect(p,'original-4',0,false);assert.equal(p.itemSleeping,false);assert.equal(sleepSource(p),true);assert.equal(p.effects.find(e=>e.id==='original-14').active,true);
 const mask=effectCapabilities(p);assert.equal(mask&0x18,0x18);assert.equal(mask&0xd41,0);assert.ok(mask&0x200000);
 const body=structuredClone(p.dwarfBody);p.at=E.neighbors(map,p.at)[0];assert.notEqual(p.at,body.at);
 g.turn=1;g.phase='ready';assert.equal(E.beginTurn(g),true);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
 p.effects.find(e=>e.id==='original-4').remaining=1;p.effectTickPending=true;tickPlayerEffects(p);assert.equal(sleepSource(p),false);assert.equal(hasEffect(p,'original-14'),false);assert.equal(effectCapabilities(p),0xfff);
 assert.equal(p.at,body.at);assert.equal(p.direction,body.direction);assert.equal(p.dwarfBody,undefined);
});
test('sleep gun removes active dwarf and can transfer from its sleeping owner',()=>{
 const g=game();applyEffect(g.players[1],'original-14',1);applyEffect(g.players[1],'original-4',0,false);transferSleep(g,1,2);
 assert.equal(hasEffect(g.players[1],'original-14'),false);assert.equal(sleepSource(g.players[1]),false);assert.equal(g.players[2].itemSleeping,true);assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
});
