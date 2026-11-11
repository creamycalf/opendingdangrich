// Installed APK integration. Seed only validated saves; restore user's save in finally.
const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
const revision=process.env.QA_REVISION||'rc17';
const adb='F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe';
const run=(...args)=>execFileSync(adb,['-s','emulator-5580',...args],{encoding:'utf8'}).trim();
(async()=>{
 run('forward','tcp:9223','localabstract:webview_devtools_remote_'+run('shell','pidof','local.dingdang.touch'));
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true}),page=browser.contexts()[0].pages()[0];
 await page.waitForFunction(()=>!!window.__game);
 const backup=await page.evaluate(async()=>(await window.Capacitor.Plugins.GameSave.read()).value),errors=[],checks=[];
 const E=await import('../app/src/engine.mjs'),C=await import('../app/src/commands.mjs'),F=await import('./item-fixture.mjs'),effects=await import('../app/src/effects.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 page.on('pageerror',e=>errors.push(e.message));const cdp=await page.context().newCDPSession(page);
 async function tap(locator){await locator.waitFor({state:'visible'});const r=await locator.boundingBox();assert.ok(r);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 async function load(g){
  E.restore(map,JSON.stringify(g));await page.evaluate(async value=>{await window.Capacitor.Plugins.GameSave.write({value});localStorage.setItem('dingdang.touch.v2',value)},JSON.stringify(g));
  await page.reload();await page.waitForFunction(()=>!!window.__game);await tap(page.locator('#titleGate'));
  await tap(page.getByRole('button',{name:'大富翁',exact:true}));await tap(page.locator('#continueGame'));
  await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
 }
 async function detail(item){await tap(page.locator('#items'));await tap(page.getByRole('button',{name:'查看 '+E.ITEMS[item].name,exact:true}));await tap(page.getByRole('button',{name:'查看用法 · '+E.ITEMS[item].name,exact:true}));}
 try{
  for(const [existing,item] of [['original-14','original-38'],['original-38','original-14']]){
   const {g}=F.itemFixture(map,item);effects.applyEffect(g.players[0],existing);await load(g);await detail(item);
   assert.equal(await page.getByRole('button',{name:'使用道具',exact:true}).isDisabled(),true);
   const state=await page.evaluate(()=>window.__game.snapshot().game);assert.deepEqual(state.players[0].inventory,[item]);
   checks.push({item,existing,result:'mutual exclusion displayed; inventory retained'});
  }
  for(const item of ['original-26','original-30','original-33','original-12']){
   const f=F.itemFixture(map,item),g=f.g,command=f.command;
   if(item==='original-26'){
    effects.wakePlayer(g.players[1]);g.players[1].effects=[];g.players[0].inventory=[];g.turn=1;g.players[1].inventory=[item];
    effects.applyEffect(g.players[2],'original-4',0,false);command.target={donor:2,recipient:3};
   }
   if(item==='original-30')effects.applyEffect(g.players[1],'original-8',1,false);
   if(item==='original-33')effects.applyEffect(g.players[1],'original-35',2,false);
   let expected=C.executeCommand(map,g,command).state;
   // The mobile controller advances to the next human turn after the animation.
   expected=C.executeCommand(map,expected,{type:'nextTurn'}).state;
   expected=C.executeCommand(map,expected,{type:'beginTurn'}).state;
   await load(g);await detail(item);await tap(page.getByRole('button',{name:'使用道具',exact:true}));
   if(item==='original-26'){
    assert.equal(await page.getByRole('button',{name:g.players[2].name,exact:true}).isEnabled(),true);
    await tap(page.getByRole('button',{name:g.players[2].name,exact:true}));await tap(page.getByRole('button',{name:g.players[3].name,exact:true}));
   }else if(command.target!==undefined)await tap(page.getByRole('button',{name:g.players[command.target].name,exact:true}));
   await page.waitForFunction(()=>!!window.__game.snapshot().visual);
   await page.waitForFunction(()=>!window.__game.snapshot().visual&&!window.__game.snapshot().busy,{},{timeout:30000});
   const actual=await page.evaluate(()=>window.__game.snapshot().game);assert.deepEqual(actual,expected);
   assert.deepEqual(C.replayCommands(map,await page.evaluate(()=>window.__game.replay())),actual);
   assert.deepEqual(E.restore(map,JSON.stringify(actual)),actual);
   await page.waitForFunction(expected=>localStorage.getItem('dingdang.touch.v2')===expected,JSON.stringify(actual));
   if(item==='original-26'){assert.equal(actual.players[2].itemSleeping,false);assert.equal(actual.players[3].itemSleeping,true);}
   if(item==='original-30')assert.equal(actual.players[1].effects.some(e=>e.id==='original-8'),false);
   if(item==='original-33')assert.equal(actual.players[1].effects.some(e=>e.id==='original-35'),false);
   assert.deepEqual(await page.evaluate(()=>window.__game.audio().errors),[]);
   checks.push({item,result:'touch selection, animation, resulting state and save passed'});
  }
  if(revision!=='rc17'){
   const {originalLandItemNeighbor}=await import('../app/src/land-items.mjs');
   const g=E.createGame(map,{startDate:'2000-05-02'});g.players.forEach(p=>p.control='human');
   const at=map.cells.findIndex((c,i)=>E.walkable(c)&&c.event===0&&map.cells[originalLandItemNeighbor(map,i)]?.event===1),lot=originalLandItemNeighbor(map,at);
   g.players[0].at=at;g.owners[lot]=0;g.levels[lot]=1;g.kinds[lot]=2;
   effects.applyEffect(g.players[1],'original-7',1);g.players[1].effects.at(-1).target=0;
   g.phase='landed';E.landing(map,g);while(g.phase==='resolving')E.advance(map,g);
   assert.equal(g.pending.kind,'missile');await load(g);await tap(page.getByRole('button',{name:g.players[1].name,exact:true}));
   await page.waitForFunction(()=>{const s=window.__game.snapshot();return !s.busy&&s.game.players[0].jail&&!s.game.players[1].effects.some(e=>e.id==='original-7')});
   const actual=await page.evaluate(()=>window.__game.snapshot().game);
   assert.deepEqual(C.replayCommands(map,await page.evaluate(()=>window.__game.replay())),actual);assert.deepEqual(E.restore(map,JSON.stringify(actual)),actual);
   assert.equal(actual.kinds[lot],2);assert.equal(actual.players[1].jail,false);
   checks.push({item:'missile-camera',result:'touch firing reflects once, consumes camera, preserves base; replay/save passed'});
  }
  fs.writeFileSync(`test-results/${revision}-android-items.png`,execFileSync(adb,['-s','emulator-5580','exec-out','screencap','-p'],{maxBuffer:16000000}));
  assert.deepEqual(errors,[]);const apk=run('shell','pm','path','local.dingdang.touch').replace(/^package:/,'');
  fs.writeFileSync(`test-results/${revision}-android-items.json`,JSON.stringify({passed:true,apkSha256:run('shell','sha256sum',apk).split(/\s/)[0],input:'actual WebView touchscreen events on installed APK',checks,errors,limitations:'Android x86_64 emulator; deterministic source fixtures validate integration, native PC evidence is recorded separately.'},null,2));
 }finally{
  await page.evaluate(async value=>{await window.Capacitor.Plugins.GameSave.write({value});if(value)localStorage.setItem('dingdang.touch.v2',value);else localStorage.removeItem('dingdang.touch.v2')},backup);
  await page.reload();await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
