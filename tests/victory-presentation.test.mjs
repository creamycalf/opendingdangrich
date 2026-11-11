import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createVictoryMotion,advanceVictoryMotion,tickVictoryMotion,victoryStaticIds} from '../app/src/victory-presentation.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../app/public/assets/victory-scenes/catalog.json',import.meta.url)));
test('native 50 completion, seat banner marker35, two 640px strips and banner exit retain order',()=>{
 let s=createVictoryMotion();for(let i=0;i<20;i++)s=tickVictoryMotion(s);assert.equal(s.stage,'gate');s=advanceVictoryMotion(s);
 for(let i=0;i<98;i++)s=tickVictoryMotion(s);assert.equal(s.stage,'banner-in');for(let i=0;i<35;i++)s=tickVictoryMotion(s);assert.equal(s.stage,'buildings-in');assert.equal(s.banner,35);
 for(let i=0;i<64;i++)s=tickVictoryMotion(s);assert.equal(s.stage,'buildings-ready');assert.equal(s.left,0);
 s=advanceVictoryMotion(s);for(let i=0;i<128;i++)s=tickVictoryMotion(s);assert.equal(s.stage,'assets-ready');assert.equal(s.banner,35);
 s=advanceVictoryMotion(s);for(let i=0;i<64+37;i++)s=tickVictoryMotion(s);assert.equal(s.stage,'done');
});
test('all four original seat banners share 0x806f marker35 and have real referenced sprites',()=>{
 for(let n=53;n<57;n++){const a=catalog.animations[n];assert.equal(a.frames,72);assert.ok(a.commands.some(c=>c[0]===35&&c[1]===0x806f));for(const id of a.sprites)assert.ok(fs.existsSync(new URL('../app/public/'+catalog.images['victory-'+id].url,import.meta.url)));}
 assert.equal(catalog.animations[50].frames,98);assert.ok(catalog.animations[50].commands.some(c=>c[0]===12&&c[1]===0x8000&&c[2]===100));assert.equal(catalog.animations[66].frames,1520);
});

test('all seats, seven characters and six grades load every drawn static sprite without other seats',()=>{for(let seat=0;seat<4;seat++)for(let character=0;character<7;character++)for(const grade of 'SABCDE'){const ids=victoryStaticIds(seat,character,grade);assert.equal(ids.length,9);assert.equal(new Set(ids).size,9);for(const id of ids)assert.ok(catalog.static[id]?.url);assert.deepEqual(ids.slice(1,5),[567+11*seat,568+11*seat,569+11*seat,570+11*seat]);assert.equal(ids[5],571+11*seat+character);assert.equal(ids[6],612+'SABCDE'.indexOf(grade));assert.deepEqual(ids.slice(7),[611,618]);}});
