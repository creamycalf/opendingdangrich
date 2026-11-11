const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');let browser;
(async()=>{
 const out='test-results/rc24-hermit-bundle';fs.mkdirSync(out,{recursive:true});require('../app/node_modules/esbuild').buildSync({entryPoints:['app/src/hermit-view.ts'],bundle:true,format:'esm',outfile:out+'/view.js'});
 const manifest=JSON.parse(fs.readFileSync('app/public/assets/pc-hermit/images.bundle.json')),bytes=fs.readFileSync('app/public/assets/pc-hermit/images.bundle.bin');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.sha256);
 for(const [url,e] of Object.entries(manifest.entries))assert.deepEqual(bytes.subarray(e.offset,e.offset+e.length),fs.readFileSync('app/public/'+url));
 const expected=JSON.parse(fs.readFileSync('test-results/rc24-hermit-loader-benchmark/result.json')).runs[0].hashes,checks=[];
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const mode of ['bundle','fallback','broken-png']){
  const context=await browser.newContext(),page=await context.newPage();let broken=mode!=='bundle';const requests=[];
  await page.route('**/fixture',r=>r.fulfill({contentType:'text/html',body:'<meta charset="utf-8">'}));
  await page.route('**/view.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(out+'/view.js')}));
  await page.route('**/assets/pc-hermit/**',r=>{const name=new URL(r.request().url()).pathname.split('/').pop();requests.push(name);if(broken&&mode==='fallback'&&name==='images.bundle.json')return r.fulfill({status:503,body:'unavailable'});let body=fs.readFileSync('app/public/assets/pc-hermit/'+name);if(broken&&mode==='broken-png'&&name==='images.bundle.bin'){body=Buffer.from(body);body.fill(0,0,8);}return r.fulfill({contentType:name.endsWith('.json')?'application/json':name.endsWith('.bin')?'application/octet-stream':'image/png',body});});
  await page.goto('http://localhost:5188/fixture');await page.evaluate(async()=>{window.v=await import('/view.js');window.blobs=new Set();window.createdURLs=0;window.early=0;const create=URL.createObjectURL,revoke=URL.revokeObjectURL,decode=HTMLImageElement.prototype.decode;URL.createObjectURL=function(b){window.createdURLs++;const url=create.call(this,b);blobs.add(url);return url;};URL.revokeObjectURL=function(url){blobs.delete(url);return revoke.call(this,url);};HTMLImageElement.prototype.decode=function(){if(!this.complete)early++;return decode.call(this);};});
  if(mode==='broken-png'){const failure=await page.evaluate(async()=>{try{await v.loadHermitAssets();return false;}catch{return true;}});assert(failure);assert.equal(await page.evaluate(()=>blobs.size),0);assert.equal(requests.filter(x=>x.endsWith('.png')).length,0,'decode error must not silently fallback');broken=false;}
  const result=await page.evaluate(async()=>{const start=performance.now(),a=await v.loadHermitAssets(),ms=performance.now()-start,again=await v.loadHermitAssets(),hashes={};for(const [id,image] of Object.entries(a.images)){const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);hashes[id]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',ctx.getImageData(0,0,c.width,c.height).data))).map(x=>x.toString(16).padStart(2,'0')).join('');}return {ms,hashes,sameCache:a===again,early,blobs:blobs.size,created:window.createdURLs};});
  assert.deepEqual(result.hashes,expected);assert.equal(result.blobs,0);assert.equal(result.created,0);assert.equal(result.early,0);assert(result.sameCache);
  if(mode==='bundle')assert.deepEqual(requests,['catalog.json','images.bundle.json','images.bundle.bin']);
  if(mode==='fallback')assert.equal(requests.filter(x=>x.endsWith('.png')).length,436);
  checks.push({mode,ms:result.ms,all436PixelsIdentical:true,originalPngBytesIdentical:true,noEarlyDecode:true,zeroObjectUrls:true,sharedCache:true,requests:requests.length});await context.close();
 }
 fs.writeFileSync(out+'/result.json',JSON.stringify({checks},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
