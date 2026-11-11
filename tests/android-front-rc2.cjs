// Installed debug APK on an owned Android emulator. Buttons use ADB touches;
// CDP observes state and selects setup dropdowns. No PC game runtime is used.
const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const adb=process.env.ADB_PATH||'F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe';
const serial=process.env.ANDROID_SERIAL||'emulator-5580',pkg='local.dingdang.touch';
const checks=[],errors=[];let browser,page,bounds;
function check(message){checks.push(message);console.log(message);fs.writeFileSync('test-results/rc2/android-smoke-report.json',JSON.stringify({status:'running',checks,errors},null,2));}
function run(...args){return execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:20000,windowsHide:true}).trim();}
function screen(name){fs.writeFileSync(`test-results/rc2/android-${name}.png`,execFileSync(adb,['-s',serial,'exec-out','screencap','-p'],{timeout:20000,windowsHide:true}));}
async function connect(){
  let ready=false;
  for(let n=0;n<60;n++){
    try{
      const pid=run('shell','pidof',pkg);assert.match(pid,/^\d+$/);
      run('forward','tcp:9223',`localabstract:webview_devtools_remote_${pid}`);
      const targets=await (await fetch('http://127.0.0.1:9223/json/list')).json();
      if(targets.some(t=>t.type==='page'&&t.url==='https://localhost/')){ready=true;break;}
    }catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  assert.ok(ready,'Android WebView debugging endpoint did not become ready');
  browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true});
  page=browser.contexts()[0].pages()[0];assert.ok(page);
  page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>!!window.__game,{},{timeout:30000});
  readBounds();
}
function readBounds(){
  try{run('shell','uiautomator','dump','/sdcard/dingdang-ui.xml');}
  catch(error){
    // Android can terminate this short-lived diagnostic process after it has
    // written the XML. Accept only its explicit completed-write acknowledgement.
    if(error.status!==137||!String(error.stdout).includes('UI hierchary dumped to: /sdcard/dingdang-ui.xml'))throw error;
  }
  const xml=run('shell','cat','/sdcard/dingdang-ui.xml');
  const m=xml.match(/class="android.webkit.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert.ok(m);
  bounds=m.slice(1).map(Number);
}
async function tap(locator){
  await locator.scrollIntoViewIfNeeded();assert.equal(await locator.isEnabled(),true);
  const b=await locator.boundingBox();assert.ok(b);
  const size=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));
  const x=bounds[0]+(b.x+b.width/2)*(bounds[2]-bounds[0])/size.w;
  const y=bounds[1]+(b.y+b.height/2)*(bounds[3]-bounds[1])/size.h;
  assert.ok(x>=bounds[0]&&x<bounds[2]&&y>=bounds[1]&&y<bounds[3]);
  // ADB's input process can exit before WebView dispatches the touch. Wait for
  // delivery to THIS element before reading its resulting DOM/state.
  const ticket=await locator.evaluate(el=>{
    window.__qaTapSequence=(window.__qaTapSequence??0)+1;
    const n=window.__qaTapSequence;
    el.addEventListener('pointerup',()=>{window.__qaTapDelivered=n;},{once:true});
    return n;
  });
  run('shell','input','tap',String(Math.round(x)),String(Math.round(y)));
  await page.waitForFunction(n=>window.__qaTapDelivered===n,ticket);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
const state=()=>page.evaluate(()=>window.__game.snapshot());
async function seedSave(value){
  await page.evaluate(async value=>{
    await window.Capacitor.Plugins.GameSave.write({value});
    if(value===null)localStorage.removeItem('dingdang.touch.v2');else localStorage.setItem('dingdang.touch.v2',value);
  },value===null?null:JSON.stringify(value));
}
async function loadFixture(g){
 if((await state()).active){if(!await page.locator('#modal').evaluate(el=>el.open))await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));await page.waitForFunction(()=>!window.__game.snapshot().active);}
 await seedSave(g);await page.reload();await page.waitForFunction(()=>!!window.__game);await tap(page.locator('#continueGame'));await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
}
async function tapCell(at){
 const p=await page.evaluate(i=>({...window.__game.cellScreen(i),w:innerWidth,h:innerHeight}),at);
 assert.ok(p.x>0&&p.x<p.w&&p.y>70&&p.y<p.h-100,'fixture target must be touchable above HUD');
 run('shell','input','tap',String(Math.round(bounds[0]+p.x*(bounds[2]-bounds[0])/p.w)),String(Math.round(bounds[1]+p.y*(bounds[3]-bounds[1])/p.h)));
}

(async()=>{
 fs.mkdirSync('test-results/rc2',{recursive:true});
 run('shell','am','start','-n',pkg+'/.MainActivity');await connect();
 await tap(page.locator('#titleGate'));await page.locator('#newGame').waitFor({state:'visible'});screen('title');check('installed APK original title and animated door respond to ADB touch');
 await tap(page.locator('#newGame'));
 if(await page.getByRole('button',{name:'设置新游戏',exact:true}).isVisible())await tap(page.getByRole('button',{name:'设置新游戏',exact:true}));
 await tap(page.getByRole('button',{name:'选择小夫',exact:true}));assert.equal(await page.locator('#character0').inputValue(),'suneo');
 await tap(page.getByRole('button',{name:'地图：大雄的小镇',exact:true}));screen('setup');
 await tap(page.getByRole('button',{name:'开始游戏',exact:true}));await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);check('original character art and map gallery select a playable new game');
 const before=await state();await tap(page.locator('#roll'));assert((await state()).game.dicePending);assert.equal((await state()).game.players[0].at,before.game.players[0].at);check('dice result precedes movement');
 await page.waitForTimeout(2500);await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));
 const saved=(await state()).game;await browser.close();run('shell','am','force-stop',pkg);run('shell','am','start','-n',pkg+'/.MainActivity');await connect();await tap(page.locator('#titleGate'));await tap(page.locator('#continueGame'));await page.waitForFunction(()=>window.__game.snapshot().active);assert.equal((await state()).game.players[0].character,'suneo');check('native disk save survives process termination and cold resume');
 screen('board');const installedPath=run('shell','pm','path',pkg).replace(/^package:/,'');const apkSha256=run('shell','sha256sum',installedPath).split(/\s/)[0];assert.equal(apkSha256,createHash('sha256').update(fs.readFileSync('app/android/app/build/outputs/apk/debug/app-debug.apk')).digest('hex'));assert.deepEqual(errors,[]);
 fs.writeFileSync('test-results/rc2/android-smoke-report.json',JSON.stringify({status:'passed',apkSha256,checks,errors,device:serial},null,2));await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
