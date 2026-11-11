// Run only after android-smoke.cjs: exclusively uses the reserved QA emulator.
const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
const adb='F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',serial='emulator-5580',pkg='local.dingdang.touch';
const run=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:20000,windowsHide:true}).trim();
let browser;const original={airplane:run('shell','settings','get','global','airplane_mode_on'),wifi:run('shell','settings','get','global','wifi_on'),data:run('shell','settings','get','global','mobile_data')};
(async()=>{try{
 run('shell','cmd','connectivity','airplane-mode','enable');run('shell','svc','wifi','disable');run('shell','svc','data','disable');
 run('shell','am','force-stop',pkg);const start=Date.now();run('shell','am','start','-n',pkg+'/.MainActivity');
 for(let i=0;i<60;i++){
  try{const pid=run('shell','pidof',pkg);run('forward','tcp:9224','localabstract:webview_devtools_remote_'+pid);const r=await fetch('http://127.0.0.1:9224/json/list',{signal:AbortSignal.timeout(1000)});if((await r.json()).some(t=>t.url==='https://localhost/'))break;}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 browser=await chromium.connectOverCDP('http://127.0.0.1:9224',{noDefaults:true});const page=browser.contexts()[0].pages()[0],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.waitForFunction(()=>!!window.__game,{},{timeout:30000});const startupMs=Date.now()-start;
 assert.equal(run('shell','settings','get','global','airplane_mode_on'),'1');assert.equal(run('shell','settings','get','global','wifi_on'),'0');
 const connectivity=run('shell','dumpsys','connectivity');fs.writeFileSync('test-results/android-offline-connectivity.txt',connectivity);assert.match(connectivity,/Active default network: none/);
 const disk=await page.evaluate(async()=>JSON.parse((await window.Capacitor.Plugins.GameSave.read()).value));assert.ok(disk);
 await page.locator('#titleGate').click();await page.getByRole('button',{name:'大富翁',exact:true}).click();
 await page.locator('#continueGame').waitFor({state:'visible'});
 try{run('shell','uiautomator','dump','/sdcard/dingdang-offline.xml');}catch(e){if(e.status!==137||!String(e.stdout).includes('UI hierchary dumped to: /sdcard/dingdang-offline.xml'))throw e;}
 const xml=run('shell','cat','/sdcard/dingdang-offline.xml'),m=xml.match(/class="android.webkit.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert.ok(m);const bounds=m.slice(1).map(Number);
 const btn=page.locator('#continueGame'),box=await btn.boundingBox(),size=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));assert.ok(box);const resumeStart=Date.now();run('shell','input','tap',String(Math.round(bounds[0]+(box.x+box.width/2)*(bounds[2]-bounds[0])/size.w)),String(Math.round(bounds[1]+(box.y+box.height/2)*(bounds[3]-bounds[1])/size.h)));
 await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy,null,{timeout:120000});const resumeMs=Date.now()-resumeStart;const s=await page.evaluate(()=>window.__game.snapshot());assert.deepEqual(s.game,disk);assert.ok(s.loaded>1000);assert.deepEqual(errors,[]);
 await page.waitForFunction(()=>window.__game.audio().playing);assert.deepEqual(await page.evaluate(()=>window.__game.audio().errors),[]);
 fs.writeFileSync('test-results/android-offline.png',execFileSync(adb,['-s',serial,'exec-out','screencap','-p'],{timeout:20000,windowsHide:true}));
 const apk=run('shell','pm','path',pkg).replace(/^package:/,'');
 const report={status:'passed',startupMs,resumeMs,apkSha256:run('shell','sha256sum',apk).split(/\s/)[0],device:serial,airplaneMode:true,wifiEnabled:false,activeDefaultNetwork:'none',resumedExactSave:true,loadedSprites:s.loaded,audioPlaying:true,errors};
 fs.writeFileSync('test-results/android-offline-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{
  run('shell','cmd','connectivity','airplane-mode',original.airplane==='1'?'enable':'disable');run('shell','svc','wifi',original.wifi==='1'?'enable':'disable');run('shell','svc','data',original.data==='1'?'enable':'disable');if(browser)await browser.close();
 }
})().catch(e=>{console.error(e);fs.writeFileSync('test-results/android-offline-report.json',JSON.stringify({status:'failed',error:String(e)},null,2));process.exitCode=1;});
