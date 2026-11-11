import test from 'node:test';
import assert from 'node:assert/strict';
import {readFilePrefix,readFileRange} from '../vm-app/web/fileRanges.mjs';
const bytes=Uint8Array.of(1,2,3,4),missingSparse=async()=>null;
test('persisted save is visible to prefix-based FindFirstFile enumeration',async()=>{
 const read=async p=>p==='save0000.dat'?bytes:null;
 assert.deepEqual(await readFilePrefix(read,missingSparse,'save0000.dat',1),{bytes:Uint8Array.of(1),totalSize:4});
 assert.equal(await readFilePrefix(read,missingSparse,'missing.dat',1),null);
 assert.deepEqual(await readFileRange(read,missingSparse,'save0000.dat',2,8),Uint8Array.of(3,4));
 assert.deepEqual(await readFilePrefix(async()=>new Uint8Array(),missingSparse,'empty.dat',1),{bytes:new Uint8Array(),totalSize:0});
});
test('voice sparse reads do not materialize the full archive',async()=>{
 const read=async()=>{throw Error('full archive read');};
 const sparse=async(p,offset,length)=>({bytes:bytes.slice(offset,offset+length),totalSize:999999});
 assert.deepEqual(await readFilePrefix(read,sparse,'voice.dat',2),{bytes:Uint8Array.of(1,2),totalSize:999999});
 assert.deepEqual(await readFileRange(read,sparse,'voice.dat',1,2),Uint8Array.of(2,3));
});
