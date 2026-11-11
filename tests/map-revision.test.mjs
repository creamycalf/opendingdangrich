import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,restore} from '../app/src/engine.mjs';
const read=(folder,id)=>JSON.parse(fs.readFileSync(new URL(`../app/public/assets/${folder}/${id}.json`,import.meta.url)));
test('all eight new PC maps retain distinct save identities and reject cross-version load',()=>{
 let changes=0;
 for(let i=0;i<8;i++){
  const old=read('maps',i),next=read('maps-v126',i),g=createGame(next),legacy=createGame(old);
  assert.equal(next.revision,'pc-v126');assert.equal(g.mapRevision,'pc-v126');
  assert.deepEqual(restore(next,JSON.stringify(g)),g);
  assert.throws(()=>restore(old,JSON.stringify(g)),/版本/);
  delete legacy.mapRevision;assert.deepEqual(restore(old,JSON.stringify(legacy)),legacy);
  assert.throws(()=>restore(next,JSON.stringify(legacy)),/版本/);
  changes+=next.cells.filter((c,n)=>JSON.stringify(c)!==JSON.stringify(old.cells[n])).length;
  for(const s of next.shops)assert.equal(next.cells[s.y*next.width+s.x].event,5);
 }assert.equal(changes,59);
});
