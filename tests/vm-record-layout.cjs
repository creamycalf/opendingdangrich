const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const p=await b.newPage({hasTouch:true}),checks=[];
  await p.route('http://record.test/**',r=>r.fulfill({contentType:r.request().url().endsWith('.mjs')?'text/javascript':'text/html',body:r.request().url().endsWith('.mjs')?fs.readFileSync('vm-app/web/navigationTouch.mjs','utf8'):'<html><style>body{margin:0}</style><script type="module">import {mountNavigationTouch} from "/nav.mjs";window.inputs=[];window.controls=mountNavigationTouch(document.body,{onInput:e=>inputs.push(e),onClear:()=>{},onLayout:s=>window.layout=s});</script></html>'}));
  await p.goto('http://record.test/');await p.waitForFunction(()=>window.controls);
  for(const [width,height] of [[640,320],[915,412],[320,640]])for(const context of ['record','record-name']){
   await p.setViewportSize({width,height});await p.evaluate(context=>controls.setRecord({context,seat:3}),context);
   assert(await p.locator('.doraNavGrid').isVisible());const boxes=await p.locator('.doraNav button').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().toJSON()));
   for(const r of boxes){assert(r.width>=44&&r.height>=44);assert(r.x>=0&&r.y>=0&&r.right<=width&&r.bottom<=height);}
   assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
   checks.push({width,height,context,passed:true});
  }
  await p.locator('[data-action=confirm]').tap();assert.deepEqual(await p.evaluate(()=>inputs.slice(0,2)),[{action:'confirm',down:true},{action:'confirm',down:false}]);
  await p.evaluate(()=>controls.setRecord(null));assert.equal(await p.locator('.doraNavGrid').isVisible(),false);
  fs.writeFileSync('test-results/vm-record-layout.json',JSON.stringify({checks,actualTouch:true,closesAfterRecord:true},null,2));console.log('6 record layouts, touch and exit passed');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
