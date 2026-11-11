import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EFFECTS,originalEffectPairConflict,canAttackPlayer,applyEffect} from '../app/src/effects.mjs';
import {V126_EFFECT_CONFLICTS} from '../app/src/v126-effect-tables.mjs';
import {itemKey} from '../app/src/inventory.mjs';
import * as E from '../app/src/engine.mjs';
import {executeCommand,replayCommands} from '../app/src/commands.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const f=read('./fixtures/v126-item-common.json'),map=read('../app/public/assets/maps-v126/4.json');
test('new PC: all 7,744 native pair/source/mode queries and both complete tables',()=>{
  assert.equal(f.sourceSha256,'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1');
  assert.equal(f.conflicts.length,7744);assert.deepEqual(V126_EFFECT_CONFLICTS,f.tables);
  for(const c of f.conflicts)assert.equal(originalEffectPairConflict(`original-${c.old}`,`original-${c.new}`,c.sameSource,c.attack),c.result,JSON.stringify(c));
});
test('new PC: constructor durations and masks for every persistent ported effect',()=>{
  for(const [id,e] of Object.entries(EFFECTS)){
    const c=f.constructors[e.originalId];
    assert.deepEqual([e.duration,e.mask,e.value],[c.duration,c.mask,c.value],id);
  }
});
test('new PC: common attack eligibility with one active state, live/dead and character restrictions',()=>{
  let n=0;
  for(const c of f.targets){
    if(c.old!==null&&!EFFECTS[itemKey(c.old)])continue;
    // ID3 has an additional subclass gate, outside the shared native callback.
    if(c.attack===3&&c.old===3)continue;
    const target={eliminated:!c.alive,character:c.shizuka?'shizuka':'gian',effects:c.old===null?[]:[{id:itemKey(c.old),source:0,remaining:3}]};
    assert.equal(canAttackPlayer({character:c.nobita?'nobita':'doraemon'},target,0,itemKey(c.attack)),c.allowed,JSON.stringify(c));n++;
  }
  assert.ok(n>3000);
});
test('new PC: mechanical dwarf and bamboo flight reject each other without consuming inventory',()=>{
  for(const [existing,item] of [['original-14','original-38'],['original-38','original-14']]){
    const g=E.createGame(map,{startDate:'2000-05-02'});g.players[0].inventory=[item];applyEffect(g.players[0],existing);
    const before=structuredClone(g);
    assert.throws(()=>executeCommand(map,g,{type:'useItem',item}),/状态/);assert.deepEqual(g,before);
  }
});
test('new PC: exchange cloth clears target army, situation swap clears target ghost; replay/save agree',()=>{
  for(const [existing,item] of [['original-8','original-30'],['original-35','original-33']]){
    const initial=E.createGame(map,{startDate:'2000-05-02'});initial.players[0].inventory=[item];
    applyEffect(initial.players[1],existing,2,false);const oldPos=initial.players[1].at;
    const command={type:'useItem',item,target:1},g=executeCommand(map,initial,command).state;
    assert.equal(g.players[0].at,oldPos);assert.equal(g.players[1].effects.some(e=>e.id===existing),false);
    assert.equal(g.phase,'end');assert.deepEqual(E.restore(map,JSON.stringify(g)),g);
    assert.deepEqual(replayCommands(map,{format:'dingdang-replay-v1',initial,commands:[command]}),g);
  }
});
