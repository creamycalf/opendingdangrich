import {test} from 'node:test';import assert from 'node:assert/strict';
import {loadImageSources} from '../app/src/image-loader.mjs';
test('thousands of original sprites are loaded with bounded requests, cache reuse and duplicate keys',async()=>{
 let active=0,peak=0,created=0;const target={},cached={old:{cached:true}};
 const create=()=>({set src(url){created++;active++;peak=Math.max(peak,active);queueMicrotask(()=>{active--;this.onload();});}});
 const sources=Array.from({length:4000},(_,i)=>['sprite-'+i,'sprite/'+i]);sources.push(['sprite-0','sprite/0'],['old','cached']);
 await loadImageSources(sources,target,cached,16,create);assert.equal(peak,16);assert.equal(created,4000);assert.equal(active,0);assert.equal(Object.keys(target).length,4001);assert.equal(target.old,cached.old);
});
test('asset failure drains pending loads and rejects instead of leaving a startup promise hanging',async()=>{
 let active=0,created=0;const create=()=>({set src(url){active++;created++;queueMicrotask(()=>{active--;url==='bad'?this.onerror():this.onload();});}});
 await assert.rejects(loadImageSources([['bad','bad'],...Array.from({length:100},(_,i)=>[String(i),String(i)])],{}, {},4,create),/资源加载失败：bad/);assert.equal(active,0);assert.ok(created<101);
});
