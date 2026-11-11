const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');let browser,server;
(async()=>{
 const out='test-results/rc24-hermit-loader-benchmark';fs.mkdirSync(out,{recursive:true});
 const source=fs.readFileSync('tests/fixtures/rc24-hermit-file-loader.ts','utf8');
 for(const limit of [8,16])require('../app/node_modules/esbuild').buildSync({stdin:{contents:source.replace(/Math.min\((8|16),jobs.length\)/,'Math.min('+limit+',jobs.length)'),resolveDir:process.cwd()+'/app/src',loader:'ts'},bundle:true,format:'esm',outfile:out+'/'+limit+'.js'});
 server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost').pathname;let path=url.startsWith('/assets/pc-hermit/')?'app/public'+url:/^\/(8|16)\.js$/.test(url)?out+url:null;if(!path){res.end('<meta charset="utf-8">');return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',url.endsWith('.js')?'text/javascript':url.endsWith('.json')?'application/json':'image/png');res.end(fs.readFileSync(path));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const runs=[];
 for(const limit of [8,16,16,8,8,16]){
  const context=await browser.newContext(),page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async limit=>{
   const timings=[],records=new WeakMap(),original=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src'),decode=HTMLImageElement.prototype.decode;let active=0,peak=0,early=0;
   Object.defineProperty(HTMLImageElement.prototype,'src',{...original,set(value){const r={url:value,start:performance.now(),load:0,decode:0};records.set(this,r);active++;peak=Math.max(peak,active);this.addEventListener('load',()=>r.load=performance.now()-r.start,{once:true});original.set.call(this,value);}});
   HTMLImageElement.prototype.decode=async function(){if(!this.complete)early++;const t=performance.now();await decode.call(this);const r=records.get(this);r.decode=performance.now()-t;timings.push(r);active--;};
   const v=await import('/'+limit+'.js'),t=performance.now(),a=await v.loadHermitAssets(),loadMs=performance.now()-t;
   const hashes={};for(const [id,image] of Object.entries(a.images)){const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);hashes[id]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,c.width,c.height).data))).map(x=>x.toString(16).padStart(2,'0')).join('');}
   const cachedAt=performance.now(),cached=await v.loadHermitAssets();return {limit,loadMs,peak,early,count:timings.length,cachedMs:performance.now()-cachedAt,sameCache:cached===a,loadSumMs:timings.reduce((s,r)=>s+r.load,0),decodeSumMs:timings.reduce((s,r)=>s+r.decode,0),hashes};
  },limit);
  assert.equal(result.count,436);assert.equal(result.early,0);assert.equal(result.peak,limit);assert(result.sameCache);if(runs.length)assert.deepEqual(result.hashes,runs[0].hashes,'every decoded original pixel stays identical');runs.push(result);await context.close();
 }
 fs.writeFileSync(out+'/result.json',JSON.stringify({scope:'Desktop Chrome cold contexts, local HTTP no-store, six alternating batches; not Android speed evidence',runs},null,2));console.log(runs.map(({hashes,...r})=>r));await browser.close();server.close();
})().catch(async e=>{console.error(e);await browser?.close();server?.close();process.exitCode=1;});
