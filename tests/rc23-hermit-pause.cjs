const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
 const out='test-results/rc23-hermit-pause';fs.mkdirSync(out,{recursive:true});
 require('../app/node_modules/esbuild').buildSync({entryPoints:['app/src/hermit-view.ts','app/src/hermit-status-view.ts'],bundle:true,splitting:true,format:'esm',outdir:out});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage();
 await page.route('**/fixture',r=>r.fulfill({contentType:'text/html',body:'<dialog open><div id="content"></div></dialog><div id="hud"></div>'}));
 await page.route('**/*.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(out+'/'+new URL(r.request().url()).pathname.split('/').pop())}));
 await page.route('**/assets/pc-hermit/**',r=>{const name=new URL(r.request().url()).pathname.split('/').pop();return r.fulfill({contentType:name.endsWith('.json')?'application/json':'image/png',body:fs.readFileSync('app/public/assets/pc-hermit/'+name)});});
 await page.goto('http://localhost:5188/fixture');
 await page.evaluate(async()=>{
  window.v=await import('/hermit-view.js');window.h=await import('/hermit-status-view.js');await v.loadHermitAssets();
  let now=performance.now(),hidden=false,serial=0,frames=new Map();
  Object.defineProperty(performance,'now',{value:()=>now});Object.defineProperty(document,'hidden',{get:()=>hidden});Object.defineProperty(document,'visibilityState',{get:()=>hidden?'hidden':'visible'});
  window.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};window.cancelAnimationFrame=id=>frames.delete(id);
  window.step=ms=>{now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
  window.hide=value=>{hidden=value;document.dispatchEvent(new Event('visibilitychange'));};
  window.calls=0;window.sounds=[];window.clearScene=()=>{document.querySelector('#content').replaceChildren();window.calls=0;window.sounds=[];};
  window.mountChoice=()=>v.mountHermitChoices(document.querySelector('#content'),{onChoose:()=>calls++,onSound:n=>sounds.push(n)});
 });
 const phase=()=>page.locator('.hermitChoices,.hermitResult').getAttribute('data-phase');
 const step=ms=>page.evaluate(ms=>step(ms),ms),click=selector=>page.locator(selector).evaluate(el=>el.click());
 const pause=async()=>{const before=await page.evaluate(()=>({sounds:[...sounds],calls,canvas:document.querySelector('.hermitStage')?.toDataURL()}));await page.evaluate(()=>{hide(true);hide(true);});await step(60000);assert.deepEqual(await page.evaluate(()=>({sounds:[...sounds],calls,canvas:document.querySelector('.hermitStage')?.toDataURL()})),before,'hidden frame must not play sound, draw or settle');await page.evaluate(()=>hide(false));await step(1);assert.deepEqual(await page.evaluate(()=>({sounds:[...sounds],calls,canvas:document.querySelector('.hermitStage')?.toDataURL()})),before,'return must retain the same active frame');};
 const checks=[];
 await page.evaluate(()=>mountChoice());await step(100);assert.equal(await phase(),'enter');await pause();await step(2100);assert.equal(await phase(),'greeting');
 await click('.hermitOpen');await step(500);await pause();await step(2600);assert.equal(await phase(),'instruction');await click('.hermitOpen');await page.evaluate(()=>hide(true));await click('.hermitOpen');assert.equal(await phase(),'choose','hidden confirmation is ignored');await page.evaluate(()=>hide(false));await click('.hermitOpen');await step(500);await pause();assert.equal(await page.evaluate(()=>calls),0);await step(1700);assert.equal(await page.evaluate(()=>calls),1);await step(60000);assert.equal(await page.evaluate(()=>calls),1);checks.push('enter/summon/confirm preserve active time through 60 second hidden intervals; confirmed choice settles once');
 for(const good of [true,false]){
  await page.evaluate(good=>{clearScene();v.mountHermitResult(document.querySelector('#content'),{good,selected:0,text:'already settled',appliedEvents:[{player:0,name:'玩家',event:6,remaining:5}],onContinue:()=>calls++,onSound:n=>sounds.push(n)});},good);
  await step(500);await pause();await step(2400);assert.equal(await phase(),'result');await click('.hermitContinue');await step(500);await pause();await step(5700);assert.equal(await phase(),'status');await step(200);await pause();assert.equal(await page.evaluate(()=>calls),0);await step(1500);assert.equal(await page.evaluate(()=>calls),1);checks.push((good?'good':'bad')+' reveal/leave/status pause without losing original frames or emitting deferred continuation');
 }
 await page.evaluate(()=>{clearScene();hide(true);mountChoice();});await step(60000);assert.deepEqual(await page.evaluate(()=>sounds),[]);await page.evaluate(()=>hide(false));await step(100);assert.equal(await phase(),'enter');await pause();
 await page.evaluate(()=>{hide(true);document.querySelector('dialog').close();});await page.evaluate(()=>{hide(false);step(60000);});assert.equal(await page.evaluate(()=>calls),0);checks.push('load completion while hidden does not start audio; closing a hidden scene never resumes callbacks');
 await page.evaluate(()=>{document.querySelector('dialog').remove();window.sounds=[];window.hud=h.mountHermitStatusView(document.querySelector('#hud'),{onInspect:()=>{},onSound:n=>sounds.push(n)});hud.update({player:0,events:[{id:6,remaining:5}]});});
 await page.waitForFunction(()=>document.querySelector('.hermitStatusCard canvas').toDataURL().length>500);
 await page.evaluate(()=>{hud.update({player:0,events:[]});step(100);hide(true);hide(false);step(60000);});assert.deepEqual(await page.evaluate(()=>sounds),[]);assert.equal(await page.locator('.hermitStatusRemoval').count(),0);checks.push('HUD cancels obsolete removal animation immediately on backgrounding; no delayed removal sound after resume');
 fs.writeFileSync(out+'/result.json',JSON.stringify({checks,scope:'isolated real components with controlled RAF/time/visibility, not a claim that production backgroundPause retains its scene'},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
