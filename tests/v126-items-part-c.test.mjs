import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EFFECTS,applyEffect,tickOriginalCounter,originalAirHit,canAttackPlayer} from '../app/src/effects.mjs';
import {createGame,restore} from '../app/src/engine.mjs';
import {itemKey} from '../app/src/inventory.mjs';
const native=JSON.parse(fs.readFileSync(new URL('../docs/audits/items-2026-11-07-part-c-native.json',import.meta.url)));
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url)));
test('b99f native constructor duration/capability masks for all attached IDs28-41',()=>{
 assert.equal(native.sourceSha256,'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1');
 for(const r of native.items){const e=EFFECTS[itemKey(r.id)];if(!e)continue;assert.equal(e.duration,r.fields['0x70']);assert.equal(e.mask>>>0,r.fields['0x74']);assert.equal(e.value,r.fields['0x78']);}
});
test('b99f original air gun branch all 2000 draws and nine counter boundaries',()=>{
 for(const r of native.airGun.samples)assert.equal(originalAirHit(r.expert,r.draw),r.hit);
 for(const r of native.tick.samples)assert.equal(tickOriginalCounter(r.before).remaining,r.after);
});
test('part-C attached effects preserve counters, sources and flags through save/restore',()=>{
 for(const r of native.items){const key=itemKey(r.id);if(!EFFECTS[key]||r.id===32)continue;
  const g=createGame(map,{startDate:'2000-04-03'});applyEffect(g.players[1],key,0,false);assert.deepEqual(restore(map,JSON.stringify(g)),g,key);
 }
});
test('shrink and headband reject an already-small target',()=>{
 const g=createGame(map,{startDate:'2000-04-03'});g.players[1].small=true;
 for(const key of ['original-35','original-39'])assert.equal(canAttackPlayer(g.players[0],g.players[1],0,key,1),false);
});
