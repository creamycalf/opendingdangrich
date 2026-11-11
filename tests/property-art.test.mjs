import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {propertyDirection,propertySprite} from '../app/src/property-art.mjs';
import {CHARACTERS} from '../app/src/engine.mjs';
import {boardEventDescription} from '../app/src/board-cell-info.mjs';
const maps=Array.from({length:8},(_,n)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/maps-v126/${n}.json`,import.meta.url))));
const oracle=JSON.parse(fs.readFileSync(new URL('./fixtures/original-property-art.json',import.meta.url)));
test('all 497 property directions exactly match original x86 road-facing selection',()=>{
 for(const row of oracle.rows)assert.equal(propertyDirection(maps[row.map],row.lot),row.direction,JSON.stringify(row));
});
test('every map / property / owner / character / upgrade stays in the correct coloured family',()=>{
 for(const row of oracle.rows)for(let owner=0;owner<4;owner++)for(const {id:character} of CHARACTERS)for(let level=0;level<=4;level++){
  const sprite=propertySprite({owner,level,character,direction:propertyDirection(maps[row.map],row.lot)});
  assert.ok(maps[row.map].art['2-'+sprite]);
  assert.equal(Math.floor(sprite/57),owner);
  const family=sprite%57;
  assert.ok(level===0?family===0:level<4?family>=1+(level-1)*4&&family<=level*4:family>=13&&family<=40,JSON.stringify({row,owner,character,level,sprite}));
 }
});
test('future-world first upgrade no longer selects previous-owner black placeholder',()=>{
 const map=maps[5],lot=map.cells.findIndex(c=>c.event===1&&c.terrain===13),direction=propertyDirection(map,lot);
 assert.equal(1+(map.cells[lot].terrain-32+4)%4+3*57,169);
 assert.ok(propertySprite({owner:3,level:1,character:'gian',direction})>=172);
});
test('red and black circle help distinguishes rewards, fines and their actual rules',()=>{
 const game={rewardNext:150,inflation:1.5,pool:73,rentPool:92};
 assert.match(boardEventDescription(10,game),/红底.*150.*50～450/);
 assert.match(boardEventDescription(11,game),/黑底.*75～149.*1.5.*免罚/);
});
