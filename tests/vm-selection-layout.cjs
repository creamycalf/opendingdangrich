const {chromium}=require('../app/node_modules/playwright');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const checks=[];try{const p=await b.newPage({hasTouch:true});await p.route('http://selection.test/**',r=>r.fulfill({contentType:r.request().url().endsWith('.mjs')?'text/javascript':'text/html',body:r.request().url().endsWith('.mjs')?fs.readFileSync('vm-app/web/selectionTouch.mjs','utf8'):'<html><style>body{margin:0}</style><script type="module">import {mountSelectionTouch} from "/selection.mjs";window.inputs=[];window.controls=mountSelectionTouch(document.body,{onInput:e=>inputs.push(e)});</script></html>'}));await p.goto('http://selection.test/');await p.waitForFunction(()=>window.controls);
 const state=async(joined,stage=0,owner=0)=>p.evaluate(({joined,stage,owner})=>controls.setState({visible:true,active:true,stage,owner,seats:Array.from({length:4},(_,seat)=>({seat,joined:joined[seat],choice:seat}))}),{joined,stage,owner});
 for(const [width,height] of [[640,320],[915,412],[320,640]]){
  await p.setViewportSize({width,height});await p.evaluate(()=>controls.setState({visible:false,active:false,seats:[]}));await state([0,0,0,0]);
  assert.equal(await p.locator('.doraSelection button:visible').count(),3);
  await p.getByRole('button',{name:'P1 我要玩',exact:true}).tap();assert.deepEqual(await p.evaluate(()=>inputs.slice(-2)),[{seat:0,action:'confirm',down:true},{seat:0,action:'confirm',down:false}]);
  await state([1,0,0,0]);assert.equal(await p.locator('.doraSelectionGrid button').count(),4);
  assert((await p.locator('.doraSelection').boundingBox()).height<=102,'single-player bar stays compact');
  await p.getByRole('button',{name:'其他玩家',exact:true}).tap();assert.equal(await p.locator('.doraSelectionSeats button:visible').count(),4);
  await p.getByRole('button',{name:'操作 P4',exact:true}).tap();assert.equal(await p.locator('.doraSelectionSeats').isVisible(),false);
  await p.getByRole('button',{name:'P4 我要玩',exact:true}).tap();assert.deepEqual(await p.evaluate(()=>inputs.slice(-2)),[{seat:3,action:'confirm',down:true},{seat:3,action:'confirm',down:false}]);
  await state([2,0,0,1]);await p.getByRole('button',{name:'P4 下一位',exact:true}).tap();assert.deepEqual(await p.evaluate(()=>inputs.slice(-2)),[{seat:3,action:'right',down:true},{seat:3,action:'right',down:false}]);
  await state([2,0,0,2],2,3);assert.equal(await p.locator('.doraSelection button:visible').count(),2);
  await p.getByRole('button',{name:'P4 开始游戏',exact:true}).tap();assert.deepEqual(await p.evaluate(()=>inputs.slice(-2)),[{seat:3,action:'confirm',down:true},{seat:3,action:'confirm',down:false}]);
  await state([1,1,1,1]);await p.getByRole('button',{name:'其他玩家',exact:true}).tap();
  const boxes=await p.locator('.doraSelection button:visible').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().toJSON()));for(const r of boxes){assert(r.width>=44&&r.height>=44);assert(r.x>=0&&r.y>=0&&r.right<=width&&r.bottom<=height);}assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
  await p.screenshot({path:`test-results/vm-selection-${width}x${height}.png`});
  checks.push({width,height,collapsedInitialButtons:3,stage2Buttons:2,allTouchTargetsAtLeast44:true,passed:true});
 }
 // A held original-device action must be released when switching seats.
 await p.getByRole('button',{name:'操作 P1',exact:true}).tap();const r=await p.getByRole('button',{name:'P1 下一位',exact:true}).boundingBox(),cdp=await p.context().newCDPSession(p);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await p.evaluate(()=>inputs.at(-1))).down,false);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 fs.writeFileSync('test-results/vm-selection-layout.json',JSON.stringify({checks,actualTouch:true,cancellation:true},null,2));console.log('selection layouts, single-player flow, other seats, start ownership and cancellation passed');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
