const {chromium}=require('../app/node_modules/playwright'),{build}=require('../app/node_modules/esbuild');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');let browser;
(async()=>{
 const built=await build({stdin:{contents:"import {mountCertificate} from './app/src/certificate-view.ts';window.mount=mountCertificate;",resolveDir:process.cwd()},bundle:true,write:false,outfile:'loader-harness.js'});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage(),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));let mode='delay';
 await page.route('**/loader-harness',r=>r.fulfill({contentType:'text/html',body:'<dialog open><main></main></dialog>'}));
 await page.route('**/assets/pc-certificate/*.png',async r=>{if(mode==='missing')return r.fulfill({status:404});if(mode==='delay')await new Promise(resolve=>setTimeout(resolve,350));const file=path.resolve('app/public','.'+new URL(r.request().url()).pathname);return r.fulfill({body:fs.readFileSync(file),contentType:'image/png'}).catch(()=>{});});
 await page.goto('http://127.0.0.1:5185/loader-harness');await page.addScriptTag({content:built.outputFiles.find(f=>f.path.endsWith('.js')).text});
 const start=()=>page.evaluate(()=>{window.result=null;window.controller=new AbortController();window.promise=window.mount(document.querySelector('main'),{character:'doraemon',seat:0,name:'哆啦A梦',grade:'S',assets:1234,days:2,buildings:[1,2,3,4,5]},'loader-test',window.controller.signal).then(view=>{window.view=view;window.result='loaded';},e=>window.result=e.name);});
 await start();await page.evaluate(()=>window.controller.abort());await page.waitForFunction(()=>window.result==='AbortError');await page.waitForTimeout(450);assert.equal(await page.locator('.certificateView').count(),0);checks.push('abort during delayed real image load removes pending certificate and cannot append late');
 await start();await page.evaluate(()=>document.querySelector('main').replaceChildren());await page.waitForFunction(()=>window.result==='AbortError');checks.push('host replacement cancels loading certificate without stale page content');
 mode='missing';await start();await page.waitForFunction(()=>window.result==='Error');assert.equal(await page.locator('.certificateView').count(),0);checks.push('HTTP image error rejects and removes incomplete certificate');
 mode='normal';await start();await page.waitForFunction(()=>window.result==='loaded');assert.equal(await page.locator('canvas').count(),1);await page.evaluate(()=>window.controller.abort());assert.equal(await page.locator('.certificateView').count(),0);checks.push('actual PNG load/decode draws certificate; later abort disposes loaded view');
 assert.deepEqual(errors,[]);const out='test-results/'+(process.env.QA_REVISION||'rc23')+'-image-loader';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
