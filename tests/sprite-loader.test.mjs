import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpriteLoader,drawSprite} from '../app/src/sprite-loader.mjs';
test('map art shares one decode per sheet and leaves discarded maps eligible for collection',async()=>{
 const sheet='assets/sprite-atlas/map-4-0.png',previous=globalThis.Image,requested=[];
 globalThis.Image=class{set src(url){requested.push(url);queueMicrotask(()=>this.onload());}};
 try{
  const rect={url:sheet,x:0,y:0,w:80,h:60};
  const load=createSpriteLoader({'terrain.png':rect,'road.png':{...rect,x:80}});
  const sources=[['terrain','terrain.png'],['road','road.png']],first={};
  await load(sources,first);
  const same={};await load(sources,same,first);
  assert.equal(first.terrain.image,first.road.image);
  assert.equal(same.terrain,first.terrain);
  const reopened={};await load(sources,reopened);
  assert.notEqual(first.terrain.image,reopened.terrain.image);
  assert.deepEqual(requested,[sheet,sheet]);
 }finally{globalThis.Image=previous;}
});
test('atlas frames share one decoded image, retain crop geometry and reuse across maps',async()=>{
 const previous=globalThis.Image,requests=[];
 globalThis.Image=class{set src(url){requests.push(url);queueMicrotask(()=>this.onload());}};
 try{
  const load=createSpriteLoader({'a.png':{url:'sheet.png',x:7,y:11,w:21,h:33},'b.png':{url:'sheet.png',x:28,y:11,w:15,h:40}});
  const images={};await load([['a','a.png'],['b','b.png'],['c','plain.png']],images);
  assert.deepEqual(requests,['sheet.png','plain.png']);assert.equal(images.a.image,images.b.image);
  const calls=[],ctx={drawImage:(...args)=>calls.push(args)};drawSprite(ctx,images.a,-4,19);drawSprite(ctx,images.c,8,3);
  assert.deepEqual(calls,[[images.a.image,7,11,21,33,-4,19,21,33],[images.c,8,3]]);
  const next={};await load([['a','a.png'],['different-key','b.png']],next,images);
  assert.equal(next.a,images.a);assert.equal(next['different-key'].image,images.a.image);assert.equal(requests.length,2);
 }finally{globalThis.Image=previous;}
});
