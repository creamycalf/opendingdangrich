const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const android=process.env.QA_ANDROID==='1';
const adb='F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe';
const run=(...args)=>execFileSync(adb,['-s',process.env.QA_DEVICE||'emulator-5580',...args],{encoding:'utf8'}).trim();
(async()=>{
 if(android)run('forward','tcp:9223','localabstract:webview_devtools_remote_'+run('shell','pidof','local.dingdang.touch'));
 const browser=android?await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true}):await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=android?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:915,height:412},hasTouch:true}),checks=[],errors=[];
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 let backup;
 const out='test-results/'+(process.env.QA_REVISION||'rc21')+'-cash-ui'+(android?'-android':'');fs.mkdirSync(out,{recursive:true});
 await page.addInitScript(native=>{window.cashDraws=[];let pauseScheduled=false;const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){if(String(args[0]?.src).includes('/cash-animations/')){window.cashDraws.push({url:args[0].src,t:performance.now()});if(native&&!pauseScheduled){pauseScheduled=true;setTimeout(()=>document.getElementById('menu').click(),0);}}return original.apply(this,args);};},android);
 page.on('pageerror',e=>errors.push(e.message));
 try{
  if(!android)await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);
  // Recovery only: may contain the user's save/settings. Never archive or print.
  // Refuse to overwrite an unrecovered backup left by a lost CDP connection.
  if(fs.existsSync(out+'/storage-backup.json'))throw Error('Unrecovered storage backup exists; restore it before running this test again');
  backup=await page.evaluate(async native=>({local:{...localStorage},native:native?(await window.Capacitor.Plugins.GameSave.read()).value:null}),android);
  fs.writeFileSync(out+'/storage-backup.json',JSON.stringify(backup));
  const cdp=await page.context().newCDPSession(page);
  const {audioTurnFixtures,map}=await import('./audio-turn-fixtures.mjs'),{executeCommand}=await import('../app/src/commands.mjs'),{restore}=await import('../app/src/engine.mjs');
  const cases=audioTurnFixtures(),state=()=>page.evaluate(()=>window.__game.snapshot());
  const tap=async selector=>{const locator=typeof selector==='string'?page.locator(selector):selector;await locator.waitFor({state:'visible'});await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox();assert.ok(r);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  const button=name=>page.getByRole('button',{name,exact:true});
  async function resume(){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__game);await tap('#titleGate');await tap(button('大富翁'));await tap('#continueGame');}
  async function fixture(g){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__game);await page.evaluate(async({value,native})=>{if(native)await window.Capacitor.Plugins.GameSave.write({value});localStorage.setItem('dingdang.touch.v2',value);},{value:JSON.stringify(g),native:android});await resume();}
  const scenarios=android?[['正常租金','rent']]:[['正常租金','rent'],['奖励圈','reward'],['征罚圈实际扣款','fine'],['确认升级','upgrade']];
  for(const [name,kind] of scenarios){
   const f=cases.find(f=>f.name===name),before=structuredClone(f.before);before.afterQueue='end';
   if(kind==='rent'){const land=cases.find(f=>f.name==='升级选项').before;before.players[0].at=land.players[0].at;before.visitAt=land.visitAt;before.owners={...land.owners};before.levels={...land.levels};before.kinds={...land.kinds};for(const lot of Object.keys(before.owners))before.owners[lot]=1;}
   const expected=executeCommand(map,before,f.command).state;restore(map,JSON.stringify(before));await fixture(before);
   if(kind==='upgrade')await tap(button('升级建筑'));
   await page.waitForFunction(kind=>{const s=window.__game.snapshot();return s.visual?.kind==='cash'&&s.visual.step.kind===kind&&s.visual.loaded;},kind,{timeout:15000});
   if(kind==='rent'){
    // Minimise CDP round trips before pause: Android can render the entire
    // 1.5-second effect while three unrelated diagnostics calls are in flight.
    if(!android){const menu=await page.locator('#menu').boundingBox();assert.ok(menu);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:menu.x+menu.width/2,y:menu.y+menu.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    await page.waitForFunction(()=>window.__game.snapshot().paused);const paused=await state();assert.equal(paused.visual.kind,'cash');
    await page.waitForFunction(()=>window.cashDraws.length>0);assert.deepEqual(paused.game.players.map(p=>p.cash),expected.players.map(p=>p.cash),name);
    await page.screenshot({path:`${out}/${kind}-paused.png`});
    await page.waitForTimeout(400);assert.equal((await state()).visual.frame,paused.visual.frame);assert.deepEqual((await state()).game.players.map(p=>p.cash),expected.players.map(p=>p.cash));
    await tap(button('继续游戏'));await page.waitForFunction(()=>!window.__game.snapshot().visual);
    assert.deepEqual((await state()).game.players.map(p=>p.cash),expected.players.map(p=>p.cash));
    checks.push('rent visibly draws original sprites; pause freezes frame; resume settles no second debit');
    if(android){await tap('#menu');await page.waitForFunction(()=>window.__game.snapshot().paused);await tap(button('继续游戏'));await page.waitForFunction(()=>!window.__game.snapshot().paused);checks.push('actual CDP touch opens and resumes the Android pause menu after animation completion');}
    // Reload while the new rent animation is still running, not only after it.
    await fixture(before);await page.waitForFunction(()=>window.__game.snapshot().visual?.kind==='cash'&&window.__game.snapshot().visual.loaded);
    await resume();await page.waitForFunction(()=>{const s=window.__game.snapshot();return s.active&&!s.busy});
    assert.deepEqual((await state()).game.players.map(p=>p.cash),expected.players.map(p=>p.cash));assert.equal(await page.evaluate(()=>window.cashDraws.length),0);
    checks.push('cold reload during rent animation keeps committed balances and does not replay the transaction');
   }else{
    await page.waitForFunction(()=>window.cashDraws.length>0);assert.deepEqual((await state()).game.players.map(p=>p.cash),expected.players.map(p=>p.cash),name);await page.screenshot({path:`${out}/${kind}.png`});
    await page.waitForFunction(()=>!window.__game.snapshot().visual);assert.deepEqual((await state()).game.players.map(p=>p.cash),expected.players.map(p=>p.cash));
    checks.push(`${kind} draws original cash sprites on real canvas and commits balances once`);
   }
  }
  assert.deepEqual(errors,[]);
  const apk=android?run('shell','pm','path','local.dingdang.touch').replace(/^package:/,''):null;
  fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors,input:android?'production UI CDP touch; menu DOM button click scheduled after first actual cash draw to avoid slow CDP pause race; no game state/frame mutation':'production UI CDP touch; read-only canvas draw spy',apkSha256:apk?run('shell','sha256sum',apk).split(/\s/)[0]:null},null,2));console.log(checks);
 }catch(e){console.error(await page.evaluate(()=>({snapshot:window.__game?.snapshot(),modal:document.getElementById('modalContent')?.innerText,draws:window.cashDraws?.length})));throw e;}finally{
  try{if(backup){
   // Let the active game's pagehide save finish before restoring both stores.
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__game);
   await page.evaluate(async({backup,native})=>{if(native)await window.Capacitor.Plugins.GameSave.write({value:backup.native});localStorage.clear();for(const [key,value] of Object.entries(backup.local))localStorage.setItem(key,value);},{backup,native:android});
   const restored=await page.evaluate(async native=>({local:{...localStorage},native:native?(await window.Capacitor.Plugins.GameSave.read()).value:null}),android);
   assert.deepEqual(restored,backup,'restore every original setting/unlock and native save');
   fs.writeFileSync(out+'/storage-restored.json',JSON.stringify({localStorage:true,nativeSave:android,verified:true}));fs.unlinkSync(out+'/storage-backup.json');await page.reload({waitUntil:'domcontentloaded'});
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1});

