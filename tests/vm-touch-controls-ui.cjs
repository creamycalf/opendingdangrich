const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),checks=[];
 try{
  const context=await browser.newContext({viewport:{width:640,height:320},hasTouch:true}),page=await context.newPage();
  await page.route('http://controls.test/**',route=>route.fulfill({contentType:route.request().url().endsWith('.mjs')?'text/javascript':'text/html',body:route.request().url().endsWith('.mjs')?fs.readFileSync('vm-app/web/touchControls.mjs','utf8'):'<html><style>body{margin:0;background:#273c52}</style><main></main><script type="module">import {mountTouchControls} from "/controls.mjs";window.events=[];window.layout=[];window.controls=mountTouchControls(document.body,{onInput:e=>events.push(e),onLayout:e=>layout.push(e)});</script></html>'}));
  await page.goto('http://controls.test/');await page.waitForFunction(()=>!!window.controls);
  await page.getByRole('button',{name:'小游戏按键',exact:true}).tap();
  for(const [width,height] of [[640,320],[915,412],[320,640]])for(const humans of [1,4])for(let id=0;id<8;id++){
   await page.setViewportSize({width,height});await page.evaluate(([gameId,humans])=>controls.setMode({gameId,humanSeats:Array.from({length:humans},(_,i)=>i)}),[id,humans]);
   const boxes=await page.locator('.doraTouchPair button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));assert.equal(boxes.length,humans*2);for(const r of boxes){assert(r.w>=44&&r.h>=44);assert(r.x>=0&&r.y>=0&&r.x+r.w<=width&&r.y+r.h<=height);}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);checks.push({width,height,humans,id,passed:true});
  }
  await page.setViewportSize({width:640,height:320});await page.evaluate(()=>controls.setAutomatic(true));
  for(let id=0;id<8;id++){
   await page.evaluate(gameId=>controls.setMode({gameId,humanSeats:[0,1,2,3]}),id);
   assert.equal(await page.locator('.doraTouch select:visible').count(),0);
   const box=await page.locator('.doraTouch').boundingBox();assert(box.height<=70,`auto panel height ${box.height}`);assert(box.y>=250);
   const sizes=await page.locator('.doraTouchPair button').evaluateAll(bs=>bs.map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})));assert(sizes.every(b=>b.w>=44&&b.h>=44));checks.push({kind:'automatic-compact',id,height:box.height,passed:true});
  }
  await page.screenshot({path:'test-results/vm-touch-controls-automatic.png'});
  await page.evaluate(()=>{controls.setMode({gameId:0,humanSeats:[0,1,2,3]});events.length=0;});
  const cdp=await context.newCDPSession(page),boxes=await page.locator('.doraTouchPair button[data-action=left]').evaluateAll(bs=>bs.map((b,id)=>{const r=b.getBoundingClientRect();return{id,x:r.x+r.width/2,y:r.y+r.height/2};}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:boxes});await page.waitForTimeout(350);const held=await page.evaluate(()=>events.slice());assert.equal(held.length,4);assert(held.every(e=>e.down&&e.behavior==='hold'));assert.deepEqual(held.map(e=>e.seat).sort(),[0,1,2,3]);
  await page.screenshot({path:'test-results/vm-touch-controls-four-player.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal((await page.evaluate(()=>events)).filter(e=>!e.down).length,4);checks.push({kind:'four-real-touch-pointers-hold-cancel',passed:true});
  for(const action of ['blur','hide','mode','dispose']){
   await page.evaluate(()=>events.length=0);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[boxes[0]]});
   await page.evaluate(action=>{if(action==='blur')dispatchEvent(new Event('blur'));if(action==='hide')controls.setOpen(false);if(action==='mode')controls.setMode({gameId:4});if(action==='dispose')controls.dispose();},action);
   assert.equal((await page.evaluate(()=>events)).filter(e=>!e.down).length,1);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});if(action==='hide')await page.evaluate(()=>controls.setOpen(true));checks.push({kind:action+'-release',passed:true});
  }
  fs.writeFileSync('test-results/vm-touch-controls-ui.json',JSON.stringify({status:'passed',checks,scope:'Standalone overlay DOM and real Chromium touch input; original VM gameplay acceptance is separate.'},null,2));console.log(checks.length,'overlay checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
