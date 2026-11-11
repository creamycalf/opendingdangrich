import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createGame,random,restore} from '../app/src/engine.mjs';
import {applyEffect,hasEffect} from '../app/src/effects.mjs';
import {applyHermitEvent,createHermitEvent,prepareHermitEvent} from '../app/src/hermit.mjs';
import {mapRegion,insideRegion} from '../app/src/map-regions.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const map=read('../app/public/assets/maps-v126/4.json');map.jail=read('../app/public/assets/flow-assets.json').jail;
const redirected=new Set([...Array.from({length:13},(_,i)=>14+i),29,30]);
function game(){const g=createGame(map,{seed:72,startDate:'2000-04-03'}),land=map.cells.flatMap((c,i)=>c.event===1?[i]:[]),outside=map.cells.findIndex(c=>c.event===0&&!insideRegion(mapRegion(map,3),c.x,c.y));
 for(let i=0;i<4;i++){g.players[i].at=outside;g.players[i].inventory=['original-33','original-1','air'];for(let k=0;k<3;k++){const j=land[i*3+k];g.owners[j]=i;g.kinds[j]=k+1;g.levels[j]=k+1;}}
 applyEffect(g.players[0],'original-17',0);g.players[0].effects.at(-1).target=2;return g;}
test('all 35 event IDs retain or consume diamond according to new PC entry calls',()=>{
 for(let id=0;id<35;id++){const g=game(),e={...createHermitEvent(id,g,n=>random(g,n)),all:false};if(id===10)applyEffect(g.players[1],'air',1);if(id===3)e.lot=map.cells.findIndex((c,i)=>c.event===1&&g.owners[i]===undefined);if(id===4)e.lot=Number(Object.keys(g.owners)[0]);if(id===12)e.count=3;
 const result=applyHermitEvent(map,g,e,n=>random(g,n));assert.equal(hasEffect(g.players[0],'original-17'),!redirected.has(id),`diamond ${id}`);assert.equal(result.text.includes('将事件转移给'),redirected.has(id),`target ${id}`);
 }
});
test('each redirectable event consumes failed diamond but does not redirect protected or eliminated target',()=>{
 for(const id of redirected)for(const blocked of ['dead','charm','snail']){const g=game();if(blocked==='dead')g.players[2].eliminated=true;else applyEffect(g.players[2],blocked==='charm'?'charm':'original-22',2);
 const result=applyHermitEvent(map,g,{id,all:false},n=>random(g,n));assert.equal(hasEffect(g.players[0],'original-17'),false,`${id}/${blocked}`);assert.equal(result.text.includes('将事件转移给'),false,`${id}/${blocked}`);}
});
test('all-player event variants preserve every diamond and do not chain redirects',()=>{
 for(const id of [14,22,23,24,25,26,30]){const g=game();applyEffect(g.players[2],'original-17',2);g.players[2].effects.at(-1).target=3;applyHermitEvent(map,g,{id,all:true},n=>random(g,n));assert.ok(hasEffect(g.players[0],'original-17'));assert.ok(hasEffect(g.players[2],'original-17'));}
 const g=game();applyEffect(g.players[2],'original-17',2);g.players[2].effects.at(-1).target=3;applyHermitEvent(map,g,{id:21,all:false},()=>0);assert.equal(g.players[2].itemSleeping,true);assert.equal(g.players[3].itemSleeping,false);assert.ok(hasEffect(g.players[2],'original-17'));
});
test('spatial prison eligibility and global shrink preserve existing target state',()=>{
 const g=game(),q=g.players[2],r=mapRegion(map,3);q.at=r[1]*map.width+r[0];q.jail=false;
 assert.equal(applyHermitEvent(map,g,{id:30,all:false},()=>0).text.includes('将事件转移给'),false);
 const h=game();h.turn=2;h.players[2].at=q.at;assert.equal(prepareHermitEvent(map,h,{id:30,all:false},()=>0),false);
 const k=game();k.players[2].small=true;k.players[2].events=[{id:22,remaining:2}];applyHermitEvent(map,k,{id:22,all:true},()=>0);assert.deepEqual(k.players[2].events,[{id:22,remaining:2}]);
});
test('new native helper confirms remove-before-check and failure destruction',()=>{
 const fx=read('./fixtures/v126-diamond.json');assert.equal(fx.rows.length,16);for(const r of fx.rows){assert.equal(r.removed,r.hasDiamond&&!r.good);assert.equal(r.destroyed,r.removed);assert.equal(r.redirected,r.removed&&r.alive&&r.eligible);}
});
