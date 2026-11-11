import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createGame} from '../app/src/engine.mjs';
import {mapAnimationTick,triggeredMapAnimation} from '../app/src/map-animation.mjs';
import {animationFrame} from '../app/src/character-animation.mjs';
const maps=Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps/${i}.json`,import.meta.url))));
test('all original animated map cells resolve to their map palette and idle frame',()=>{
 let count=0;
 for(const map of maps)for(const c of map.cells.filter(c=>(c.flags&7)===6)){
  count++;const a=map.animations[c.object];assert.ok(a);
  assert.ok(animationFrame(a,mapAnimationTick(c,a,100),false).length);
  for(const sprite of a.sprites)assert.ok(map.art['3-'+sprite]);
  if([6,15].includes(c.event)){assert.equal(mapAnimationTick(c,a,100),a.frames-1);assert.equal(mapAnimationTick(c,a,100,100),0);assert.equal(mapAnimationTick(c,a,1000,100),a.frames-1);}
 }
 assert.equal(count,42);
});
test('choosing a bank transfer keeps the mine idle until a transaction is committed',()=>{
 const map=maps[4],g=createGame(map),next=structuredClone(g),lot=map.cells.findIndex(c=>c.event===6);
 next.pending={kind:'bank',lot};assert.equal(triggeredMapAnimation(map,g,next,{type:'advance'}),null);
 assert.equal(triggeredMapAnimation(map,next,next,{type:'answer',action:'deposit'}),null);
});
