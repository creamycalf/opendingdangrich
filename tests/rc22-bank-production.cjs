const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const android=process.env.QA_ANDROID==='1',out='test-results/rc22-bank-production'+(android?'-android':'');
const adb='F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe';
const run=(...args)=>execFileSync(adb,['-s','emulator-5580',...args],{encoding:'utf8',timeout:20000}).trim();
const bounded=promise=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Browser operation exceeded 20 seconds')),20000);promise.then(resolve,reject).finally(()=>clearTimeout(timer));});
(async()=>{
 const E=await import('../app/src/engine.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const game=E.createGame(map,{seed:72,startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
 game.phase='prompt';game.pending={kind:'bank',lot:map.cells.findIndex(c=>c.event===6)};game.players[0].at=E.adjacent(map,game.pending.lot).find(i=>E.walkable(map.cells[i]));
 fs.mkdirSync(out,{recursive:true});if(android)run('forward','tcp:9223','localabstract:webview_devtools_remote_'+run('shell','pidof','local.dingdang.touch'));
 const browser=android?await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true,timeout:20000}):await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const nativePage=android?browser.contexts()[0].pages()[0]:null;let backup;const checks=[],errors=[];
 if(android){const evaluate=nativePage.evaluate.bind(nativePage);nativePage.evaluate=(...args)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Android evaluation timed out')),15000);evaluate(...args).then(resolve,reject).finally(()=>clearTimeout(timer));});}
 try{
  if(android){assert(!fs.existsSync(out+'/storage-backup.json'),'restore existing backup first');backup=await nativePage.evaluate(async()=>({native:(await window.Capacitor.Plugins.GameSave.read()).value,local:{...localStorage}}));fs.writeFileSync(out+'/storage-backup.json',JSON.stringify(backup));}
  for(const [width,height,position,expectedCash,expectedBank] of android?[[320,640,75,1500,500]]:[[915,412,25,500,1500],[640,320,75,1500,500],[360,640,0,0,2000]]){
   const context=android?nativePage.context():await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true}),page=android?nativePage:await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
   const bankHook=()=>{window.bankCashFirst=null;const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){if(!window.bankCashFirst&&String(args[0]?.src).includes('/cash-animations/')){const v=window.__game?.snapshot().visual;if(v?.step.kind==='bank')window.bankCashFirst={frame:v.frame,preFrames:v.step.preFrames,delta:v.step.delta};}return draw.apply(this,args);};};if(!android)await page.addInitScript(bankHook);
   page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page);const send=cdp.send.bind(cdp);cdp.send=(...args)=>bounded(send(...args));
   const tap=async loc=>{await loc.waitFor({state:'visible'});const r=await bounded(loc.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}}));assert(r);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
   const resume=async()=>{await page.waitForFunction(()=>!!window.__game);if(android)await page.evaluate(bankHook);await tap(page.locator('#titleGate'));await tap(page.getByRole('button',{name:'大富翁',exact:true}));await tap(page.locator('#continueGame'));await page.waitForFunction(()=>window.__game.snapshot().active&&!!window.__game.snapshot().game);};
   if(android){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__game);await page.evaluate(async value=>{await window.Capacitor.Plugins.GameSave.write({value});localStorage.setItem('dingdang.touch.v2',value);},JSON.stringify(game));await page.reload({waitUntil:'domcontentloaded'});}
   else{await context.addInitScript(g=>{if(!localStorage.getItem('fixture-seeded')){localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));localStorage.setItem('fixture-seeded','yes');}},game);await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185',{waitUntil:'domcontentloaded'});}
   await resume();const slider=page.getByRole('slider',{name:'矿山存取比例'});await slider.waitFor();const r=await slider.boundingBox(),x=r.x+12+(r.width-24)*position/100,y=r.y+r.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await slider.inputValue(),String(position));
   assert.equal(await page.evaluate(()=>window.__game.snapshot().game.players[0].cash),1000,'preview is read-only');if(android)fs.writeFileSync(`${out}/bank-${width}-${position}.png`,execFileSync(adb,['-s','emulator-5580','exec-out','screencap','-p'],{timeout:20000,maxBuffer:8*1024*1024}));else await page.screenshot({path:`${out}/bank-${width}-${position}.png`});
   await tap(page.getByRole('button',{name:'确认存取',exact:true}));await page.waitForFunction(()=>!!window.bankCashFirst);const rendered=await page.evaluate(()=>window.bankCashFirst);assert(rendered.frame>=rendered.preFrames);assert.equal(rendered.delta,expectedCash-1000);
   await page.waitForFunction(()=>!window.__game.snapshot().busy);let p=await page.evaluate(()=>window.__game.snapshot().game.players[0]);assert.equal(p.cash,expectedCash);assert.equal(p.bank,expectedBank);
   await page.reload({waitUntil:'domcontentloaded'});await resume();await page.waitForFunction(()=>!window.__game.snapshot().busy);p=await page.evaluate(()=>window.__game.snapshot().game.players[0]);assert.equal(p.cash,expectedCash);assert.equal(p.bank,expectedBank);assert.equal(await page.evaluate(()=>window.bankCashFirst),null);
   checks.push({width,height,position,expectedCash,expectedBank,rendered,savedExactlyOnce:true});if(!android)await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({checks,errors,apkSha256:android?run('shell','sha256sum',run('shell','pm','path','local.dingdang.touch').replace('package:','')).split(/\s/)[0]:null},null,2));
 }finally{
  if(android&&backup){await nativePage.reload({waitUntil:'domcontentloaded',timeout:15000});await nativePage.waitForFunction(()=>!!window.__game&&!window.__game.snapshot().active);await nativePage.evaluate(async b=>{await window.Capacitor.Plugins.GameSave.write({value:b.native});localStorage.clear();for(const [k,v] of Object.entries(b.local))localStorage.setItem(k,v);},backup);assert.deepEqual(await nativePage.evaluate(async()=>({native:(await window.Capacitor.Plugins.GameSave.read()).value,local:{...localStorage}})),backup);await nativePage.reload({waitUntil:'domcontentloaded',timeout:15000});await nativePage.waitForFunction(()=>!!window.__game);assert.deepEqual(await nativePage.evaluate(async()=>({native:(await window.Capacitor.Plugins.GameSave.read()).value,local:{...localStorage}})),backup);fs.writeFileSync(out+'/storage-restored.json',JSON.stringify({verified:true,reloadedAndVerified:true}));fs.unlinkSync(out+'/storage-backup.json');}
  await browser.close();
 }
 console.log(checks);
})().catch(e=>{console.error(e);process.exitCode=1;});
