import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import test from 'node:test';
import {animationFrame, boardActorSpritePoint,boardCharacterSprites} from '../app/src/character-animation.mjs';

test('all seven board characters have complete active animation and sprite resources',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../app/public/assets/character-poses/catalog.json',import.meta.url)));
 assert.equal(Object.keys(catalog.characters).length,7);
 assert.ok(catalog.animations[337], 'yellow south-facing idle is also used outside the selection screen');
 for(const sprite of boardCharacterSprites(catalog)){
  assert.ok(catalog.images[sprite], 'missing image metadata '+sprite);
  assert.ok(existsSync(new URL('../app/public/'+catalog.images[sprite].url,import.meta.url)), 'missing board sprite '+sprite);
 }
});

test('walking and standing shadows remain inside their projected road diamond', () => {
 const catalog = JSON.parse(readFileSync(new URL('../app/public/assets/character-poses/catalog.json',import.meta.url)));
 const center = {x:360, y:180};
 let shadows=0;
 for(const character of Object.values(catalog.characters)) for(const poses of Object.values(character)) {
  for(const pose of [0,3]) for(const id of poses[pose]) {
   const animation=catalog.animations[id];
   for(let tick=0;tick<animation.frames;tick++) {
    const shadow=animationFrame(animation,tick).find(cmd=>cmd.layer===1);
    if(!shadow) continue;
    const image=catalog.images[shadow.sprite];
    const point=boardActorSpritePoint(center,shadow,image);
    const dx=point.x+image.w/2-center.x, dy=point.y+image.h/2-center.y;
    assert.ok(Math.abs(dx)/40+Math.abs(dy)/20<=1,`shadow outside road in animation ${id} frame ${tick}`);
    shadows++;
   }
  }
 }
 assert.ok(shadows>2000);
});
