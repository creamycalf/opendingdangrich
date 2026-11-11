import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {ITEMS,restore} from '../app/src/engine.mjs';import {itemVisualPlan} from '../app/src/item-presentation.mjs';
import {animationFrame} from '../app/src/character-animation.mjs';import {itemFixture} from './item-fixture.mjs';
const map=JSON.parse(fs.readFileSync(new URL('../app/public/assets/maps/4.json',import.meta.url))),catalog=JSON.parse(fs.readFileSync(new URL('../app/public/assets/item-animations/catalog.json',import.meta.url)));
test('all 42 legal item commands have original animated visuals without changing committed state',()=>{
 for(const item of Object.keys(ITEMS)){
  const {g,after,command}=itemFixture(map,item),before=JSON.stringify(g),saved=JSON.stringify(after),steps=itemVisualPlan(map,g,after,command,catalog);
  assert.ok(steps.length,item);assert.equal(JSON.stringify(g),before);assert.equal(JSON.stringify(after),saved);assert.deepEqual(restore(map,saved),after);
  for(const step of steps){assert.ok(Number.isFinite(step.point.x)&&Number.isFinite(step.point.y));const a=catalog.animations[step.animation];let painted=0;
   for(let n=0;n<a.frames;n++)for(const c of animationFrame(a,n,false)){assert.ok(catalog.images[c.sprite],item);painted++;}
   assert.ok(painted>0,item);
  }
 }
});
