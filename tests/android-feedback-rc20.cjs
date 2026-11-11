const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');const fs=require('node:fs'),assert=require('node:assert/strict');
const adb=(...a)=>execFileSync('F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',['-s','emulator-5580',...a],{encoding:'utf8'}).trim();
(async()=>{
 const E=await import('../app/src/engine.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const g=E.createGame(map,{startDate:'2000-04-03'});g.players.forEach(p=>p.control='human');g.players[0].cash=10000;g.players[0].inventory=[];g.players[1].inventory=Object.keys(E.ITEMS);
 const lot=map.cells.findIndex(c=>c.event===5&&E.adjacent(map,c.y*map.width+c.x).some(i=>E.walkable(map.cells[i])));
 g.phase='prompt';g.pending={kind:'shop',lot};g.players[0].at=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));E.restore(map,JSON.stringify(g));
 adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+adb('shell','pidof','local.dingdang.touch'));
 const b=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true}),p=b.contexts()[0].pages()[0];await p.reload();await p.waitForFunction(()=>!!window.__game);
 const backup=await p.evaluate(async()=>({native:(await window.Capacitor.Plugins.GameSave.read()).value,local:{...localStorage}}));const errors=[],checks=[];p.on('pageerror',e=>errors.push(e.message));
 const cdp=await p.context().newCDPSession(p);
 async function tap(l){await l.waitFor({state:'visible'});if(await l.evaluate(e=>e.classList.contains('shopItem')))await l.scrollIntoViewIfNeeded();const r=await l.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 const button=n=>p.getByRole('button',{name:n,exact:true});
 try{
  await p.evaluate(async value=>{await window.Capacitor.Plugins.GameSave.write({value});localStorage.setItem('dingdang.touch.v2',value)},JSON.stringify(g));await p.reload();await p.waitForFunction(()=>!!window.__game);
  await tap(p.locator('#titleGate'));await tap(button('大富翁'));await tap(p.locator('#continueGame'));await tap(button('购买道具'));
  assert.equal(await p.locator('.shopPager').count(),0);
  await tap(button('查看 护身符'));await tap(p.locator('.shopTransact'));await tap(p.locator('.shopTransact'));
  assert.equal(await p.locator('#shopItemName').innerText(),'护身符');let actual=await p.evaluate(()=>window.__game.snapshot().game);assert.deepEqual(actual.players[0].inventory,['charm','charm']);assert.equal(actual.players[0].cash,9840);checks.push('two touch purchases remain in catalog; cash and duplicate quantity correct');
  await tap(button('离开商店'));await p.waitForFunction(()=>{const s=window.__game.snapshot();return !s.busy&&s.game.turn===1});await tap(p.locator('#items'));
  assert.equal(await p.locator('.shopItem').count(),42);const r=await p.locator('.shopItems').boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height-20}]});
  for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height-20-(r.height-40)*i/10}]});await p.waitForTimeout(20);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(250);assert(await p.locator('.shopItems').evaluate(e=>e.scrollTop)>0);
  await tap(p.locator('.shopItem').last());assert((await p.locator('.shopDescription').innerText()).length>10);await tap(p.locator('.shopTransact'));await button('使用道具').waitFor();await tap(button('返回口袋'));await tap(button('返回游戏'));assert.equal(await p.locator('#modal').evaluate(e=>e.open),false);checks.push('42-item pocket scrolls with real swipe, shows last item details, returns to board');
  await p.reload();await p.waitForFunction(()=>!!window.__game);await tap(p.locator('#titleGate'));await tap(button('小游戏'));await tap(button('练习模式'));
  await tap(button('切换玩家 1 真人或电脑'));await tap(button('切换玩家 4 真人或电脑'));await tap(button('确定角色'));await tap(button('障碍竞速'));await tap(button('开始小游戏'));
  const feedback=p.locator('.miniRaceFeedback');await feedback.waitFor();
  for(let i=0;i<12;i++){const r=await p.locator('.miniPlayer.human .miniControls button').first().boundingBox();assert(r);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(80);}
  await p.waitForFunction(()=>document.querySelector('.miniRaceFeedback')?.textContent.includes('加速 12 次'),{},{timeout:10000});
  const guard=await p.locator('.miniPlayer.human .miniControls button').last().boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:guard.x+guard.width/2,y:guard.y+guard.height/2}]});await p.waitForFunction(()=>document.querySelector('.miniRaceFeedback').textContent.includes('防守'));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  fs.writeFileSync('test-results/rc20-android-feedback.png',execFileSync('F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',['-s','emulator-5580','exec-out','screencap','-p'],{maxBuffer:16000000}));
  checks.push('installed APK P4 practice accepts12 taps, held defense and release; enlarged controls rendered');
  assert.deepEqual(errors,[]);const apk=adb('shell','pm','path','local.dingdang.touch').replace(/^package:/,'');
  fs.writeFileSync('test-results/rc20-android-feedback.json',JSON.stringify({passed:true,checks,errors,apkSha256:adb('shell','sha256sum',apk).split(/\s/)[0]},null,2));
 }finally{
  await p.reload();await p.waitForFunction(()=>!!window.__game);await p.evaluate(async backup=>{await window.Capacitor.Plugins.GameSave.write({value:backup.native});localStorage.clear();for(const[k,v]of Object.entries(backup.local))localStorage.setItem(k,v)},backup);await p.reload();await b.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
