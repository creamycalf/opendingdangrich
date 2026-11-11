const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
const out='test-results/rc22-hermit-lifecycle';fs.mkdirSync(out,{recursive:true});
require('../app/node_modules/esbuild').buildSync({entryPoints:['app/src/hermit-view.ts'],bundle:true,format:'esm',outfile:out+'/view.js'});
browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[];
for(const failure of [true,false]){
 const context=await browser.newContext({viewport:{width:640,height:320},hasTouch:true,isMobile:true}),page=await context.newPage();page.setDefaultTimeout(12000);
 await page.route('**/fixture',r=>r.fulfill({contentType:'text/html',body:'<dialog id="modal"><div id="modalContent"></div></dialog>'}));
 await page.route('**/view.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(out+'/view.js')}));
 await page.route('**/assets/pc-hermit/**',r=>{const name=new URL(r.request().url()).pathname.split('/').pop();return failure?r.fulfill({status:503,body:'unavailable'}):r.fulfill({contentType:name.endsWith('.json')?'application/json':'image/png',body:fs.readFileSync('app/public/assets/pc-hermit/'+name)});});
 await page.goto('http://127.0.0.1:5188/fixture');await page.evaluate(async()=>{window.v=await import('/view.js');window.calls=0;window.sounds=[];document.querySelector('dialog').showModal();});
 if(failure){
  await page.evaluate(()=>window.v.mountHermitResult(document.querySelector('#modalContent'),{good:true,selected:0,text:'已结算结果',onContinue:()=>window.calls++}));
  await page.locator('.hermitResult[data-error=assets]').waitFor();await page.locator('.hermitContinue').evaluate(e=>{e.click();e.click();});assert.equal(await page.evaluate(()=>window.calls),1);
  await page.evaluate(()=>{document.querySelector('#modalContent').replaceChildren();window.v.mountHermitChoices(document.querySelector('#modalContent'),{onChoose:()=>window.calls++});});
  await page.locator('.hermitChoices[data-error=assets]').waitFor();assert(await page.locator('.hermitOpen').isDisabled());assert.equal(await page.evaluate(()=>window.calls),1);
  checks.push('Missing assets preserve settled result and permit one continuation; unconfirmed choice cannot transact');
 }else{
  await page.evaluate(()=>window.v.mountHermitChoices(document.querySelector('#modalContent'),{onChoose:()=>window.calls++,onSound:clip=>window.sounds.push(clip)}));
  await page.getByRole('button',{name:'老师好，请继续',exact:true}).tap();await page.getByRole('button',{name:'选择宝箱',exact:true}).tap();await page.locator('.hermitOpen').tap();await page.waitForTimeout(100);
  await page.evaluate(()=>document.querySelector('dialog').close());const sounds=await page.evaluate(()=>window.sounds);await page.waitForTimeout(2400);assert.equal(await page.evaluate(()=>window.calls),0);assert.deepEqual(await page.evaluate(()=>window.sounds),sounds);
  checks.push('Closing during confirmed casting cancels deferred game callback and later sounds');
  await page.evaluate(()=>{const c=document.querySelector('#modalContent');c.replaceChildren();document.querySelector('dialog').showModal();window.sounds=[];window.v.mountHermitResult(c,{good:true,selected:0,text:'四人真实状态反馈',appliedEvents:[0,1,2,3].map(player=>({player,name:'玩家'+player,event:5,remaining:5})),onSound:n=>window.sounds.push(n),onContinue:()=>window.calls++});});
  await page.locator('.hermitContinue:enabled').waitFor();await page.locator('.hermitContinue').tap();await page.waitForFunction(()=>window.calls===1,null,{timeout:20000});assert.deepEqual(await page.evaluate(()=>window.sounds),[11,13,11,16,33,17,17,17,17]);checks.push('Four actual recipients show four status sounds and one continuation');
 }
 await context.close();
}
fs.writeFileSync(out+'/result.json',JSON.stringify({checks},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
