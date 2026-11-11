import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {EFFECTS,effectCapabilities} from '../app/src/effects.mjs';
import {canTakeSleep} from '../app/src/target-items.mjs';
const fx=JSON.parse(fs.readFileSync(new URL('../research/items-b-native-match-20261107.json',import.meta.url)));
test('new PC fourteen item constructors and 490 native mask samples agree with product',()=>{
 assert.equal(fx.newSha256,'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1');
 for(const r of fx.newFactoryExecution){if(r.id===21){assert.equal(r.duration,0);continue;}const e=EFFECTS['original-'+r.id];assert.equal(e.duration,r.duration);assert.equal(e.mask>>>0,Number(r.mask));assert.equal(e.value,Number(r.value));for(const m of r.masks)assert.equal(effectCapabilities({effects:[{id:'original-'+r.id}],events:[]},m.base),m.after,`${r.id}/${m.base}`);}
});
test('new PC donor callback executes all 32 sleep/character/alive/dwarf cases',()=>{
 assert.equal(fx.newSleepDonorExecution.length,32);for(const r of fx.newSleepDonorExecution){const p={character:r.nobita?'nobita':'doraemon'},q={character:r.shizuka?'shizuka':'gian',eliminated:!r.alive,itemSleeping:r.sleep,effects:r.dwarf?[{id:'original-14',active:true}]:[]};assert.equal(!!canTakeSleep(p,q),r.allowed,JSON.stringify(r));}
});
