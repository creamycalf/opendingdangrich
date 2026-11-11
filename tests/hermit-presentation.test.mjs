import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {soundFrames,hermitSounds,hermitChoiceFrame,hermitResultFrame} from '../app/src/hermit-presentation.mjs';
import {diffHermitStatuses,hermitRemovalFrame} from '../app/src/hermit-status-model.mjs';
const c=JSON.parse(readFileSync(new URL('../app/public/assets/pc-hermit/catalog.json',import.meta.url)));
test('original directional opcode gives one appearance sound and one disappearance sound',()=>{
 assert.deepEqual(soundFrames(c.animations[9],true),[{tick:7,clip:11}]);
 assert.deepEqual(soundFrames(c.animations[9]),[{tick:10,clip:11}]);
 assert.deepEqual(hermitSounds(c,9,-1,31,true),[11]);
 assert.deepEqual(hermitSounds(c,9,31,100,true),[]);
});
test('native casting markers, reverse boxes, and six tick stagger preserve slot order',()=>{
 assert.equal(hermitChoiceFrame('summon',44).boxes.length,0);
 assert.deepEqual(hermitChoiceFrame('summon',45).boxes.map(b=>[b.slot,b.tick]),[[0,31]]);
 assert.deepEqual(hermitChoiceFrame('summon',57).boxes.map(b=>[b.slot,b.tick]),[[0,19],[1,25],[2,31]]);
 for(let slot=0;slot<3;slot++){const v=hermitChoiceFrame('confirm',30,slot);assert.equal(v.boxes[slot].tick,0);assert.equal(v.done,false);assert.equal(hermitChoiceFrame('confirm',63,slot).done,true);}
});
test('good/bad reveal then close, fly away, full departure and native 45 tick tail',()=>{
 for(const good of [false,true]){const n=good?82:80;assert.equal(hermitResultFrame('reveal',n-1,good,2).done,false);assert.equal(hermitResultFrame('reveal',n,good,2).done,true);}
 for(const [tick,box,actor] of [[0,8,3],[19,8,3],[20,9,3],[51,9,3],[52,null,5],[135,null,5],[136,null,null]]){const v=hermitResultFrame('leave',tick,true,0);assert.equal(v.box?.id??null,box);assert.equal(v.actor?.[0]??null,actor);assert.equal(v.done,false);}
 assert.equal(hermitResultFrame('leave',180,true,0).done,false);assert.equal(hermitResultFrame('leave',181,true,0).done,true);
 assert.deepEqual(hermitSounds(c,5,-1,84),[16,33]);
});
test('all 35 event status mappings originate from new PC constructors, no fake instantaneous status',()=>{
 assert.equal(Object.keys(c.events).length,35);
 const ids=Object.entries(c.events).filter(([,e])=>e.hasStatus).map(([id])=>Number(id));
 assert.deepEqual(ids,[1,2,5,6,7,14,15,16,17,18,19,20,21,22,23,24]);
 assert.deepEqual(ids.map(id=>c.events[id].icon.id),Array.from({length:16},(_,i)=>328+i));
 for(const [id,e] of Object.entries(c.events)){assert.equal(e.good,Number(id)<14);assert.equal(!!e.icon,e.hasStatus);if(e.hasStatus)assert.equal(e.duration,Number(id)===21?4:5);}
 assert.equal(c.dialogue.greeting,'我是仙人機械人，快叫我一聲老師吧！');
});
test('status countdown is not removal; native remove uses12, not ability13',()=>{
 assert.deepEqual(diffHermitStatuses([{id:6,remaining:5}],[{id:6,remaining:4}]),[]);
 assert.deepEqual(diffHermitStatuses([{id:6,remaining:1},{id:24,remaining:2}],[{id:24,remaining:2}]),[{id:6,remaining:1}]);
 assert.equal(hermitRemovalFrame(21,true).npc,16);assert.equal(hermitRemovalFrame(22,false).npc,17);
 assert.equal(hermitRemovalFrame(21,true).status,null);assert.equal(hermitRemovalFrame(22,true).status,12);assert.equal(hermitRemovalFrame(24,true).iconVisible,true);assert.equal(hermitRemovalFrame(25,true).iconVisible,false);
 assert.equal(hermitRemovalFrame(40,true,false).done,true);assert.equal(hermitRemovalFrame(40,true,true).done,false);assert.equal(hermitRemovalFrame(88,true,true).done,true);
 assert.deepEqual(hermitSounds(c,16,-1,40),[18]);assert.deepEqual(hermitSounds(c,17,-1,40),[18]);assert.deepEqual(hermitSounds(c,12,-1,9),[]);
});
