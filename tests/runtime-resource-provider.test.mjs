import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createResourceProvider} from '../runtime-touch/resource-provider.mjs';
test('guest writes preserve imported files and zero-byte saves',async()=>{
 const bytes=new Uint8Array([1,2,3]),commits=[];
 const p=createResourceProvider([['DATA/Game.dat',bytes]],async s=>commits.push(s));
 (await p.read('data\\GAME.dat'))[0]=99;assert.equal((await p.read('data/game.dat'))[0],1);
 assert.equal(await p.read('missing'),null);await p.write('Save.dat',new Uint8Array());await p.flush();
 assert.equal(commits[0].get('save.dat').length,0);assert.deepEqual(await p.list(''),['data','save.dat']);assert.equal(bytes[0],1);
 assert.throws(()=>p.hasKnownFile('../outside'));assert.deepEqual([...await p.readRange('data/game.dat',2,8)],[3]);
});
test('failed persistence can retry and concurrent changes survive pending commit',async()=>{
 let reject=true,release;const commits=[];
 const p=createResourceProvider([],async s=>{if(reject)throw Error('disk full');commits.push(s);if(commits.length===1)await new Promise(r=>release=r);});
 await p.write('save',new Uint8Array([1]));await assert.rejects(p.flush(),/disk full/);reject=false;
 const pending=p.flush();await new Promise(r=>setTimeout(r,0));await p.write('save',new Uint8Array([2]));release();await pending;await p.flush();
 assert.equal(commits[0].get('save')[0],1);assert.equal(commits[1].get('save')[0],2);
});
