import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSaveStore} from '../app/src/save-store.mjs';
const web=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
test('repeated turn checkpoints share the committed snapshot but a rewind still reaches disk',async()=>{
  const writes=[];const store=createSaveStore(web(),'save',{write:async({value})=>writes.push(value)});
  await Promise.all(['rolled','rolled','landed','rolled','rolled'].map(value=>store.save(value)));
  assert.deepEqual(writes,['rolled','landed','rolled']);
});
test('native migration happens once; stale WebView data never wins over committed disk data',async()=>{
  const cache=web();cache.setItem('save','legacy');let disk={initialized:false,value:null},writes=0;
  const native={read:async()=>disk,write:async({value})=>{writes++;disk={initialized:true,value};}};
  const store=createSaveStore(cache,'save',native);assert.equal(await store.load(),'legacy');assert.equal(writes,1);
  await store.save('latest');cache.setItem('save','stale');assert.equal(await createSaveStore(cache,'save',native).load(),'latest');
  await store.save(null);cache.setItem('save','stale');assert.equal(await store.load(),null);assert.equal(cache.getItem('save'),null);assert.equal(writes,3);
});
test('native saves resolve only on acknowledgement and cannot complete out of order',async()=>{
  const waiting=[],calls=[],native={write:({value})=>{calls.push(value);return new Promise(resolve=>waiting.push(resolve));}};
  const store=createSaveStore(web(),'save',native);let done=false;
  const first=store.save('before'),last=store.save('after').then(()=>{done=true;});
  await Promise.resolve();assert.deepEqual(calls,['before']);assert.equal(done,false);
  waiting.shift()();await first;await Promise.resolve();assert.deepEqual(calls,['before','after']);assert.equal(done,false);
  waiting.shift()();await last;assert.equal(done,true);
});
test('disk write failures are reported and can be retried without losing the queue',async()=>{
  let fail=true,disk=null;const native={write:async({value})=>{if(fail)throw Error('disk full');disk=value;},read:async()=>({initialized:true,value:disk})};
  const cache=web(),store=createSaveStore(cache,'save',native);
  await assert.rejects(store.save('first'),/disk full/);assert.equal(disk,null);
  fail=false;await store.save('retry');assert.equal(disk,'retry');assert.equal(await store.load(),'retry');
});
test('browser-only saves retain existing key and expose quota failures',async()=>{
  const cache=web(),store=createSaveStore(cache,'existing');await store.save('game');assert.equal(await store.load(),'game');
  await store.save(null);assert.equal(await store.load(),null);
  cache.setItem=()=>{throw Error('quota');};await assert.rejects(store.save('game'),/quota/);
});
test('native resume and disk writes survive a full web cache',async()=>{
  const cache=web();cache.setItem=()=>{throw Error('quota');};
  let value='previous';
  const store=createSaveStore(cache,'save',{read:async()=>({initialized:true,value}),write:async next=>{value=next.value;}});
  assert.equal(await store.load(),'previous');assert.equal(store.hasSave(),true);
  await store.save('latest');assert.equal(value,'latest');
  await store.save(null);assert.equal(store.hasSave(),false);
});
