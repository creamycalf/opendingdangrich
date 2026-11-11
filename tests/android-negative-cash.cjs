// RC12 device acceptance: valid save fixtures, ADB touches, native disk restore.
const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
const revision=process.env.QA_REVISION||'rc12';
const adb='F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',serial='emulator-5580';
const run=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:20000,windowsHide:true}).trim();
(async()=>{
 const E=await import('../app/src/engine.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 run('forward','tcp:9223','localabstract:webview_devtools_remote_'+run('shell','pidof','local.dingdang.touch'));
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true}),page=browser.contexts()[0].pages()[0];
 const backup=await page.evaluate(async()=>(await window.Capacitor.Plugins.GameSave.read()).value),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  try{run('shell','uiautomator','dump','/sdcard/rc12-ui.xml');}catch(e){if(e.status!==137||!String(e.stdout).includes('UI hierchary dumped'))throw e;}
  const xml=run('shell','cat','/sdcard/rc12-ui.xml'),match=xml.match(/class="android.webkit.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert(match);const bounds=match.slice(1).map(Number);
  async function tap(locator,end=false){
   await locator.waitFor({state:'visible'});const b=await locator.boundingBox(),size=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));
   const x=end?b.x+b.width-1:b.x+b.width/2,y=b.y+b.height/2;
   run('shell','input','tap',String(Math.round(bounds[0]+x*(bounds[2]-bounds[0])/size.w)),String(Math.round(bounds[1]+y*(bounds[3]-bounds[1])/size.h)));
   await page.waitForTimeout(200);
  }
  async function load(g){
   E.restore(map,JSON.stringify(g));
   await page.reload();await page.waitForFunction(()=>!!window.__game);
   await page.evaluate(async value=>{await window.Capacitor.Plugins.GameSave.write({value});localStorage.setItem('dingdang.touch.v2',value);},JSON.stringify(g));
   await page.reload();await page.waitForFunction(()=>!!window.__game);await tap(page.locator('#titleGate'));await tap(page.getByRole('button',{name:'大富翁',exact:true}));await tap(page.locator('#continueGame'));
   await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy,null,{timeout:60000});
  }
  function fresh(){const g=E.createGame(map,{startDate:'2000-04-03',seed:123});g.players.forEach(p=>p.control='human');g.players[0].cash=-123;g.players[0].cashDebtDays=7;return g;}
  const screen=name=>fs.writeFileSync('test-results/'+revision+'-android-'+name+'.png',execFileSync(adb,['-s',serial,'exec-out','screencap','-p'],{maxBuffer:16000000,windowsHide:true}));
  await load(fresh());assert.equal(await page.locator('#cashDigits').getAttribute('aria-label'),'豆沙包 -123');
  assert.deepEqual(await page.locator('#cashDigits img').evaluateAll(ims=>ims.map(im=>Number(im.src.match(/(\d+)\.png$/)[1]))),[539,539,539,540,541,542]);
  assert.match(await page.locator('#turnBanner').innerText(),/负现金第 7 天/);screen('negative-cash');checks.push({kind:'negative-cash-hud',passed:true});
  for(const withdrawOnly of [false,true]){
   const g=fresh(),lot=map.cells.findIndex((c,i)=>c.event===6&&E.adjacent(map,i).some(n=>E.walkable(map.cells[n])));
   g.players[0].at=E.adjacent(map,lot).find(n=>E.walkable(map.cells[n]));g.players[0].bank=1000;g.phase='prompt';g.pending={kind:'bank',lot,withdrawOnly};await load(g);
   const slider=page.getByLabel('矿山存取比例');assert.equal(await slider.getAttribute('min'),withdrawOnly?'50':'0');await tap(slider,true);await page.waitForFunction(()=>document.querySelector('input[type=range][aria-label="矿山存取比例"]').value==='100');
   assert.match(await page.locator('.bankTransfer').innerText(),/手持 877 · 矿山 0/);if(withdrawOnly)assert.match(await page.locator('#modalContent').innerText(),/路过矿山时仅可提取/);screen('bank-'+(withdrawOnly?'withdraw-only':'full'));
   await tap(page.getByRole('button',{name:'确认存取',exact:true}));await page.waitForFunction(()=>window.__game.snapshot().game.players[0].cash===877&&!window.__game.snapshot().busy);
   const after=await page.evaluate(()=>window.__game.snapshot().game);assert.equal(after.players[0].bank,0);assert.notEqual(after.pending?.kind,'bank');E.restore(map,JSON.stringify(after));
   const disk=await page.evaluate(async()=>JSON.parse((await window.Capacitor.Plugins.GameSave.read()).value));assert.deepEqual(disk,after);checks.push({kind:'bank',withdrawOnly,cash:877,bank:0,nativeSaveExact:true,passed:true});
  }
  assert.deepEqual(errors,[]);
  const apk=run('shell','pm','path','local.dingdang.touch').replace(/^package:/,'');
  const report={status:'passed',device:serial,input:'ADB touchscreen taps',apkSha256:run('shell','sha256sum',apk).split(/\s/)[0],checks,errors};fs.writeFileSync('test-results/'+revision+'-android-negative-cash.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{
  // Preserve the normal, naturally reached shop/hermit save for offline resume.
  await page.reload();await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(async value=>{await window.Capacitor.Plugins.GameSave.write({value});localStorage.setItem('dingdang.touch.v2',value);},backup);await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
