// Exercise production menus, actual touch input and saved-game resume.
// Android mode backs up both native storage and all local settings/unlocks.
const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const android=process.env.QA_ANDROID==='1',revision=process.env.QA_REVISION||'rc19';
const adb='F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe';
const run=(...args)=>execFileSync(adb,['-s','emulator-5580',...args],{encoding:'utf8'}).trim();
(async()=>{
 if(android)run('forward','tcp:9223','localabstract:webview_devtools_remote_'+run('shell','pidof','local.dingdang.touch'));
 const browser=android?await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true}):await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=android?browser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:915,height:412},hasTouch:true});
 let backup;const checks=[],errors=[];
 try{
  if(!android)await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');
  await page.waitForFunction(()=>!!window.__game);
  backup=await page.evaluate(async native=>({local:{...localStorage},native:native?(await window.Capacitor.Plugins.GameSave.read()).value:null}),android);
  const cdp=await page.context().newCDPSession(page);
  page.on('pageerror',e=>errors.push(e.message));
  async function tap(locator){await locator.waitFor({state:'visible'});await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox();assert.ok(r);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  const button=name=>page.getByRole('button',{name,exact:true});
  const state=()=>page.evaluate(()=>window.__game.audio());
  async function track(id){await page.waitForFunction(id=>window.__game.audio().track===id&&window.__game.audio().playing,id,{timeout:15000});}
  async function gate(){await page.reload();await page.waitForFunction(()=>!!window.__game);await tap(page.locator('#titleGate'));}
  async function heard(kind,clip,character,mark){await page.waitForFunction(({kind,clip,character,mark})=>window.__game.audio().events.slice(mark).some(e=>e.kind===kind&&e.clip===clip&&(character===undefined||e.character===character)&&e.status==='started'),{kind,clip,character,mark});}
  async function writeSave(value){
   // Leave active gameplay first: its pagehide/visibility save must finish
   // before inserting a fixture, or it can replace the fixture on reload.
   await page.reload();await page.waitForFunction(()=>!!window.__game);
   await page.evaluate(async({value,native})=>{if(native)await window.Capacitor.Plugins.GameSave.write({value});localStorage.setItem('dingdang.touch.v2',value);},{value,native:android});
  }
  await gate();await tap(button('大富翁'));await tap(page.locator('#newGame'));
  if(await button('设置新游戏').isVisible())await tap(button('设置新游戏'));
  await track(2);
  for(const [name,id] of [['大雄',1],['小夫',4],['哆啦美',2],['静香',3],['胖虎',5],['哆啦A梦',0]]){
   const mark=(await state()).events.length;await tap(button('选择'+name));await heard('voice',59,id,mark);await heard('sfx',77,undefined,mark);
  }
  let mark=(await state()).events.length;await tap(button('选择哆啦A梦'));await heard('voice',59,0,mark);
  assert.equal((await state()).events.slice(mark).some(e=>e.kind==='sfx'&&e.clip===77),false);
  checks.push('six character taps decode their own Ready59; repeat selection has no movement cue; setup theme2');
  await tap(button('确定角色'));await tap(button('确定地图'));mark=(await state()).events.length;await tap(button('开始游戏'));await heard('sfx',82,undefined,mark);
  await page.waitForFunction(()=>{const s=window.__game.snapshot();return s.active&&!s.busy});
  assert.ok([2,3].includes((await state()).track));checks.push('valid start plays confirmation82 and enters board theme');
  const E=await import('../app/src/engine.mjs');
  const original=JSON.parse(fs.readFileSync('test-results/rc18-v126-soak-last.json'));
  const map=JSON.parse(fs.readFileSync(`app/public/assets/maps-v126/${original.map}.json`));
  for(const human of [true,false]){
   const g=structuredClone(original);g.players.forEach(p=>p.control='ai');if(human)g.players[g.winners[0]].control='human';else g.players.find((_,i)=>!g.winners.includes(i)).control='human';
   E.restore(map,JSON.stringify(g));await writeSave(JSON.stringify(g));await gate();await tap(button('大富翁'));await tap(page.locator('#continueGame'));await button('再玩一局').waitFor();await track(human?4:6);
   assert.equal((await state()).musicLoop,human);
   if(human&&await button('查看证书').isVisible()){await tap(button('查看证书'));await track(4);await tap(button('文字成绩'));}
   if(human){await tap(button('再玩一局'));await track(2);await tap(button('确定角色'));await tap(button('确定地图'));await tap(button('开始游戏'));await page.waitForFunction(()=>{const s=window.__game.snapshot();return s.active&&!s.busy});assert.ok([2,3].includes((await state()).track));}
   else{await tap(button('返回主菜单'));await track(2);}
   checks.push(human?'human victory4, certificate4, replay setup2 and new board theme restored':'AI victory6, return title2');
  }
  await tap(button('小游戏'));await tap(button('练习模式'));await track(2);mark=(await state()).events.length;await tap(button('确定角色'));await heard('sfx',82,undefined,mark);await track(5);
  const mini=button('放大光线比赛');if(!await mini.isVisible())await tap(button('下一页'));await tap(mini);await tap(button('开始小游戏'));await track(5);
  await button('再玩一次').waitFor({timeout:60000});await track(11);
  assert.equal((await state()).musicLoop,false);
  await tap(button('再玩一次'));await track(5);await tap(button('返回小游戏列表'));await tap(page.locator('#modalContent').getByRole('button',{name:'返回主菜单',exact:true}));await track(2);
  checks.push('standalone practice plays5, completed result11, retry5, title2');
  await tap(button('排行榜'));await track(2);await tap(button('返回主菜单'));await track(2);checks.push('ranking retains title2');
  const town=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
  const {executeCommand}=await import('../app/src/commands.mjs');
  for(const early of [false,true]){
   let g=E.createGame(town,{startDate:'2000-04-30'});g.players.forEach(p=>p.control='human');
   if(early){g.players[0].inventory=['original-5'];g=executeCommand(town,g,{type:'useItem',item:'original-5'}).state;}
   else{g.turn=3;g.phase='end';g=executeCommand(town,g,{type:'nextTurn'}).state;}
   assert.equal(g.pending.kind,'monthly');E.restore(town,JSON.stringify(g));
   await writeSave(JSON.stringify(g));await gate();await tap(button('大富翁'));await tap(page.locator('#continueGame'));await button('确认月结，继续游戏').waitFor();await track(early?9:10);
   await tap(button('确认月结，继续游戏'));await page.waitForFunction(()=>{const s=window.__game.snapshot();return !s.busy&&s.game.phase==='ready'});await track(early?2:3);
   checks.push(early?'early monthly9 returns April board2':'regular monthly result10 returns May board3');
  }
  assert.deepEqual(errors,[]);assert.deepEqual((await state()).errors,[]);
  const prefix=`test-results/${revision}-scene-audio-${android?'android':'chrome'}`;
  if(android)fs.writeFileSync(prefix+'.png',execFileSync(adb,['-s','emulator-5580','exec-out','screencap','-p'],{maxBuffer:16000000}));else await page.screenshot({path:prefix+'.png'});
  const apk=android?run('shell','pm','path','local.dingdang.touch').replace(/^package:/,''):null;
  fs.writeFileSync(prefix+'.json',JSON.stringify({passed:true,checks,errors,input:'CDP touchStart/touchEnd on production UI',apkSha256:apk?run('shell','sha256sum',apk).split(/\s/)[0]:null},null,2));console.log(checks);
 }catch(error){
  console.error(await page.evaluate(()=>({modal:document.getElementById('modalContent')?.innerText,state:window.__game?.snapshot(),audio:window.__game?.audio()})).then(s=>({modal:s.modal,phase:s.state?.game?.phase,active:s.state?.active,busy:s.state?.busy,paused:s.state?.paused,audio:s.audio})));throw error;
 }finally{
  if(backup){await page.reload();await page.waitForFunction(()=>!!window.__game);await page.evaluate(async({backup,native})=>{if(native)await window.Capacitor.Plugins.GameSave.write({value:backup.native});localStorage.clear();for(const [key,value] of Object.entries(backup.local))localStorage.setItem(key,value);},{backup,native:android});await page.reload();}
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
