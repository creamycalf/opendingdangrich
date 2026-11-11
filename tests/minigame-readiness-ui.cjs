const {chromium}=require('../app/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const bundle=await require('../app/node_modules/esbuild').build({entryPoints:['app/src/minigame-view.ts'],bundle:true,format:'esm',write:false,outfile:'minigame-test.js'});
  await page.route('**/src/minigame-view.ts',route=>route.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text}));
  await page.route(/\/src\/[^/]+\.mjs$/,route=>{const name=new URL(route.request().url()).pathname.split('/').pop();return route.fulfill({contentType:'text/javascript',body:fs.readFileSync('app/src/'+name,'utf8')});});
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5183',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!!window.__game,null,{timeout:120000});
  await page.locator('#titleGate').tap();await page.getByRole('button',{name:'小游戏',exact:true}).tap();
  await page.getByRole('button',{name:'练习模式',exact:true}).tap();await page.getByRole('button',{name:'确定角色',exact:true}).tap();
  await page.getByRole('button',{name:'模仿动作',exact:true}).tap();
  await page.getByRole('button',{name:'开始小游戏',exact:true}).waitFor();await page.waitForTimeout(1200);
  assert.equal(await page.locator('#miniPause').count(),0,'preparation must not start the timer');
  await page.getByRole('button',{name:'开始小游戏',exact:true}).tap();await page.locator('#miniPause').waitFor();
  assert.match(await page.locator('.miniStatus').innerText(),/准备中/);
  await page.locator('#miniPause').tap();await page.locator('#miniResume').waitFor({state:'visible'});
  const timer=await page.locator('#miniTimer').innerText();await page.waitForTimeout(1100);assert.equal(await page.locator('#miniTimer').innerText(),timer);
  await page.locator('#miniResume').tap();assert.equal(await page.locator('#miniResume').isVisible(),false);
  await page.evaluate(()=>window.dispatchEvent(new Event('dingdangPause')));await page.locator('#miniResume').waitFor({state:'visible'});
  await page.locator('#miniResume').tap();
  await page.getByRole('button',{name:'返回小游戏列表',exact:true}).tap();
  // Deterministic ordinary elimination state: still let the original tick
  // routine finish the falling animation and emit the result.
  await page.evaluate(async()=>{
   const E=await import('/src/engine.mjs'),M=await import('/src/minigames.mjs'),V=await import('/src/minigame-view.ts');
   const map=await(await fetch('/assets/maps-v126/4.json')).json(),g=E.createGame(map);
   g.players.forEach((p,i)=>p.control=i===0?'human':'ai');
   g.pending={kind:'minigame',session:M.createMiniGame(1,g.players,n=>E.random(g,n))};
   const s=g.pending.session;s.stage='playing';s.phase=2;s.players.forEach(p=>{p.mode=4;p.fallY=270;p.animation=50+p.slot;});
   const host=document.querySelector('#modalContent');window.miniCheck={finished:0,retried:0};
   window.miniCheck.dispose=await V.mountMiniGame(host,{read:()=>g,valid:()=>true,autostart:false,tick:inputs=>M.tickMiniGame(s,g.players,inputs,n=>E.random(g,n)),save:async()=>{},exit:()=>{},finish:()=>window.miniCheck.finished++,retry:()=>window.miniCheck.retried++,error:e=>{throw e;}});
  });
  await page.locator('#miniResume').tap();assert.match(await page.locator('.miniStatus').innerText(),/已出局/);
  await page.getByRole('button',{name:'重新练习',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>window.miniCheck.finished===1);assert.deepEqual(errors,[]);
  fs.writeFileSync('test-results/minigame-readiness-report.json',JSON.stringify({passed:true,checks:['practice waits for explicit start','opening animation explains disabled pose controls','pause freezes timer and exposes prominent resume','Android pause resumes via same visible control','elimination explains waiting and offers practice retry','original falling/settlement tick reaches finish'],errors},null,2));
  console.log('Minigame readiness and elimination UI passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
