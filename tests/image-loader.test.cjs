const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {transformSync}=require('../app/node_modules/esbuild');
const code=transformSync(fs.readFileSync('app/src/scene-image-loader.ts','utf8'),{loader:'ts',format:'cjs'}).code;
function harness(config={}){
 const events=[],stats={active:0,peak:0};
 class Image{
  set src(url){this.url=url;this.loaded=false;this.active=true;stats.peak=Math.max(stats.peak,++stats.active);events.push(['src',url]);const spec=config[url]||{};if(spec.never)return;setTimeout(()=>{if(!this.active)return;if(spec.error){this.release();this.onerror?.();}else{this.loaded=true;events.push(['load',url]);this.onload?.();}},spec.delay??2);}
  release(){if(this.active){this.active=false;stats.active--;}}
  removeAttribute(){this.release();events.push(['cancel',this.url]);}
  async decode(){assert.equal(this.loaded,true,'decode must follow onload');events.push(['decode',this.url]);await new Promise(r=>setTimeout(r,config[this.url]?.decodeDelay??2));this.release();if(config[this.url]?.decodeError)throw Error('decode');}
 }
 const context={module:{exports:{}},exports:{},Image,AbortController,DOMException,setTimeout,clearTimeout};vm.runInNewContext(code,context);return{...context.module.exports,stats,events};
}
test('default stays four; requested victory pool reaches sixteen but never exceeds it',async()=>{
 for(const [requested,expected] of [[undefined,4],[16,16],[100,16]]){const h=harness();await h.loadImages(Array.from({length:40},(_,i)=>String(i)),{concurrency:requested});assert.equal(h.stats.peak,expected);assert.equal(h.stats.active,0);}
});
test('load precedes decode; bounded workers preserve input order including delayed responses',async()=>{
 const h=harness({a:{delay:20}}),urls=['a','b','c','d','e','f'];const images=await h.loadImages(urls,{concurrency:2});assert.deepEqual(Array.from(images,x=>x.url),urls);assert.equal(h.stats.peak,2);assert.equal(h.stats.active,0);
});
test('abort during load cancels active images and prevents queued work',async()=>{
 const h=harness({a:{never:true},b:{never:true}}),c=new AbortController(),p=h.loadImages(['a','b','c'],{signal:c.signal,concurrency:2});c.abort();await assert.rejects(p,{name:'AbortError'});assert.equal(h.stats.active,0);assert.equal(h.events.some(e=>e[1]==='c'),false);
});
test('abort during decode rejects immediately and late decode cannot complete batch',async()=>{
 const h=harness({a:{decodeDelay:50}}),c=new AbortController(),p=h.loadImages(['a','b'],{signal:c.signal,concurrency:1});await new Promise(r=>setTimeout(r,10));c.abort();await assert.rejects(p,{name:'AbortError'});await new Promise(r=>setTimeout(r,60));assert.equal(h.events.some(e=>e[1]==='b'),false);
});
test('network and decode failures preserve cause and cancel siblings',async()=>{
 for(const mode of ['error','decodeError']){const h=harness({bad:{[mode]:true},slow:{never:true}});await assert.rejects(h.loadImages(['bad','slow','queued'],{concurrency:2}),/原图(加载|解码)失败：bad/);assert.equal(h.stats.active,0);assert.equal(h.events.some(e=>e[1]==='queued'),false);}
});
test('deadline covers stalled loads and already aborted calls do not create requests',async()=>{
 const h=harness({a:{never:true}});await assert.rejects(h.loadImage('a',{timeoutMs:10}),/超时/);assert.equal(h.stats.active,0);const c=new AbortController();c.abort();await assert.rejects(h.loadImages(['never-created'],{signal:c.signal}),{name:'AbortError'});assert.equal(h.events.some(e=>e[1]==='never-created'),false);
});
