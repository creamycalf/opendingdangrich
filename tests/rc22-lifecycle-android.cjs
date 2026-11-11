// Opt-in installed-APK QA. Run only when the parent owns the emulator slot.
// Backups live under work/qa-private-backups and must never be release assets.
const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const adbExe='F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe';
const adb=(...args)=>execFileSync(adbExe,['-s','emulator-5580',...args],{encoding:'utf8',timeout:15000}).trim();
const bounded=(promise,label)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' exceeded 15 seconds')),15000);})]).finally(()=>clearTimeout(timer));};
(async()=>{
 if(process.env.QA_ANDROID!=='1')throw Error('Set QA_ANDROID=1 only after emulator handoff');
 const E=await import('../app/src/engine.mjs'),C=await import('../app/src/commands.mjs'),F=await import('../app/src/effects.mjs');
 const activation=process.env.QA_DWARF_ACTIVATION==='1',revision=activation?'rc24-dwarf':'rc22';
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const catalog=JSON.parse(fs.readFileSync('app/public/assets/item-lifecycle/catalog.json'));
 const atlas=JSON.parse(fs.readFileSync('app/public/assets/sprite-atlas/index.json'));
 const lifecycleAtlas=Object.entries(atlas).filter(([key])=>key.startsWith('assets/item-lifecycle/')).map(([key,a])=>({...a,key}));
 const installed=adb('shell','pm','path','local.dingdang.touch').replace(/^package:/,'');
 const installedSha256=adb('shell','sha256sum',installed).split(/\s/)[0];
 if(process.env.QA_EXPECTED_APK_SHA)assert.equal(installedSha256,process.env.QA_EXPECTED_APK_SHA,'installed APK must match final deliverable');
 adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+adb('shell','pidof','local.dingdang.touch'));
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true,timeout:15000});
 const page=browser.contexts()[0].pages()[0];assert.ok(page,'running app WebView');page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
 const evaluate=(fn,arg)=>bounded(page.evaluate(fn,arg),'evaluate');
 const wait=(fn,arg)=>bounded(page.waitForFunction(fn,arg,{timeout:15000}),'waitForFunction');
 const reload=()=>bounded(page.reload({waitUntil:'domcontentloaded',timeout:15000}),'reload');
 const readStorage=()=>evaluate(async()=>({native:await window.Capacitor.Plugins.GameSave.read(),local:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))}));
 let backup,backupPath,scriptId,cdp,passed=false,restored=false;const checks=[],errors=[];
 try{
  await wait(()=>!!window.__game&&!window.__game.snapshot().active&&!window.__game.snapshot().busy);
  backup=await readStorage();assert.equal(backup.native.initialized,true,'loaded app must have initialized native storage');
  const dir=path.resolve('work/qa-private-backups');fs.mkdirSync(dir,{recursive:true});backupPath=path.join(dir,'rc22-lifecycle-'+Date.now()+'.json');
  const record={format:'dingdang-qa-storage-backup-v1',created:new Date().toISOString(),package:'local.dingdang.touch',storage:backup};
  const fd=fs.openSync(backupPath,'wx');try{fs.writeFileSync(fd,JSON.stringify(record));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  assert.deepEqual(JSON.parse(fs.readFileSync(backupPath)).storage,backup,'backup persisted before mutation');
  assert.deepEqual(await readStorage(),backup,'original storage stable before test');
  cdp=await bounded(page.context().newCDPSession(page),'CDP session');const send=(method,params)=>bounded(cdp.send(method,params),method);
  const instrument=String.raw`(()=>{window.__rc22Life={draws:[],visuals:[]};const atlas=${JSON.stringify(lifecycleAtlas)};const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(this.canvas.id==='board'){let key;if(im.src?.includes('/item-lifecycle/'))key='assets/item-lifecycle/'+im.src.split('/').at(-1);else{const a=atlas.find(a=>im.src?.endsWith(a.url)&&args[0]===a.x&&args[1]===a.y&&args[2]===a.w&&args[3]===a.h);if(a)key=a.key;}if(key&&window.__rc22Life.draws.length<5000)window.__rc22Life.draws.push(key);}return draw.call(this,im,...args);};setInterval(()=>{const s=window.__game?.snapshot();if(s?.visual?.kind==='lifecycle'&&window.__rc22Life.visuals.length<5000)window.__rc22Life.visuals.push({item:s.visual.step.item,frame:s.visual.frame,busy:s.busy});},16);})();`;
  scriptId=(await send('Page.addScriptToEvaluateOnNewDocument',{source:instrument})).identifier;
  page.on('pageerror',e=>errors.push(e.message));
  const tap=async locator=>{await locator.waitFor({state:'visible',timeout:15000});const r=await bounded(locator.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}),'touch target');assert.ok(r.width>0&&r.height>0);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  const enter=async()=>{await evaluate(source=>{if(!window.__rc22Life)(0,eval)(source);},instrument);await tap(page.locator('#titleGate'));await tap(page.getByRole('button',{name:'大富翁',exact:true}));await tap(page.locator('#continueGame'));};
  for(const id of activation?['original-14']:['original-24','original-38']){
   let g=E.createGame(map,{startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
   if(activation){F.applyEffect(g.players[1],id,1,false);g.players[0].inventory=['original-4'];}
   else{g.players[0].inventory=[id];g=C.executeCommand(map,g,{type:'useItem',item:id}).state;g.phase='ready';g.queue=[];g.pending=null;g.players[0].effects.find(e=>e.id===id).remaining=1;g.players[0].effectTickPending=true;}
   E.restore(map,JSON.stringify(g));let expected=C.executeCommand(map,g,{type:'beginTurn'}).state;
   if(activation)for(const command of [{type:'useItem',item:'original-4',target:1},{type:'nextTurn'},{type:'beginTurn'}])expected=C.executeCommand(map,expected,command).state;
   // Stop any previous live controller before replacing its persisted save.
   await reload();await wait(()=>!!window.__game&&!window.__game.snapshot().active);
   await evaluate(async value=>{await window.Capacitor.Plugins.GameSave.write({value});localStorage.setItem('dingdang.touch.v2',value);},JSON.stringify(g));
   await reload();await wait(()=>!!window.__game);await enter();
   if(activation){await wait(()=>!window.__game.snapshot().busy);await tap(page.locator('#items'));await tap(page.getByRole('button',{name:'查看 传染伤风纸电话',exact:true}));await tap(page.getByRole('button',{name:'查看用法 · 传染伤风纸电话',exact:true}));await tap(page.getByRole('button',{name:'使用道具',exact:true}));await tap(page.getByRole('button',{name:'大雄',exact:true}));}
   await wait(()=>window.__rc22Life?.visuals.length>0&&window.__rc22Life?.draws.length>0);
   fs.writeFileSync(`test-results/${revision}-android-lifecycle-${id}.png`,execFileSync(adbExe,['-s','emulator-5580','exec-out','screencap','-p'],{timeout:15000,maxBuffer:16000000}));
   await wait(()=>{const s=window.__game.snapshot();return s.active&&!s.visual&&!s.busy&&s.game.phase==='ready';});
   const observed=await evaluate(()=>({state:window.__game.snapshot().game,visuals:window.__rc22Life.visuals,draws:[...new Set(window.__rc22Life.draws)],rollDisabled:document.querySelector('#roll').disabled}));
   assert.deepEqual(observed.state,expected);assert.equal(observed.rollDisabled,false);assert.ok(observed.visuals.every(v=>v.item===id&&v.busy));
   const expectedSprites=new Set(catalog.animations[activation?121:id==='original-24'?33:42].sprites.map(n=>'assets/item-lifecycle/'+n+'.png'));
   assert.ok(observed.draws.some(key=>expectedSprites.has(key)),'original lifecycle sprites drawn on APK Canvas');
   const stored=await readStorage();assert.deepEqual(JSON.parse(stored.native.value),expected);assert.deepEqual(JSON.parse(stored.local['dingdang.touch.v2']),expected);
   await reload();await wait(()=>!!window.__game);await enter();await wait(()=>{const s=window.__game.snapshot();return s.active&&!s.busy;});
   // A bounded observation catches an accidentally replayed one-shot exit.
   await bounded(page.waitForTimeout(1000),'resume observation');
   const resumed=await evaluate(()=>({state:window.__game.snapshot().game,visuals:window.__rc22Life.visuals,draws:window.__rc22Life.draws}));
   assert.deepEqual(resumed.state,expected);assert.equal(resumed.visuals.length,0);assert.equal(resumed.draws.length,0);
   checks.push({item:id,paintedSprites:observed.draws.length,observedFrames:observed.visuals.length,persisted:true,resumeWithoutReplay:true});
  }
  assert.deepEqual(errors,[]);passed=true;
 }finally{
  try{
   if(backup&&backupPath){
    // New document cancels the fixture's controller before restoring user data.
    await reload();await wait(()=>!!window.__game&&!window.__game.snapshot().active);
    const disk=JSON.parse(fs.readFileSync(backupPath)).storage;assert.deepEqual(disk,backup);
    await evaluate(async b=>{await window.Capacitor.Plugins.GameSave.write({value:b.native.value});localStorage.clear();for(const[k,v]of Object.entries(b.local))localStorage.setItem(k,v);},disk);
    if(scriptId&&cdp){await bounded(cdp.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:scriptId}),'remove instrumentation');scriptId=null;}
    await reload();await wait(()=>!!window.__game&&!window.__game.snapshot().active);
    // Native-load cache mirroring may differ from the original cache; restore
    // every original localStorage value once initialization has completed.
    await evaluate(local=>{localStorage.clear();for(const[k,v]of Object.entries(local))localStorage.setItem(k,v);},disk.local);
    assert.deepEqual(await readStorage(),disk,'native and all localStorage restored exactly');restored=true;
   }
  }finally{
   const apk=adb('shell','pm','path','local.dingdang.touch').replace(/^package:/,'');
   const finalSha256=adb('shell','sha256sum',apk).split(/\s/)[0];assert.equal(finalSha256,installedSha256,'APK unchanged during QA');
   fs.writeFileSync(`test-results/${revision}-android-lifecycle.json`,JSON.stringify({passed:passed&&restored,restored,apkSha256:finalSha256,checks,errors,limitations:'Android x86_64 emulator; original sprites and lifecycle integration, not native PC recording.'},null,2));
   await bounded(browser.close(),'CDP disconnect');
  }
 }
 console.log(JSON.stringify({passed:passed&&restored,restored,checks}));
})().catch(e=>{console.error(e);process.exitCode=1;});
