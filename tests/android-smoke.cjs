// Installed debug APK on an owned Android emulator. Buttons use ADB touches;
// CDP observes state and selects setup dropdowns. No PC game runtime is used.
const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const adb=process.env.ADB_PATH||'F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe';
const serial=process.env.ANDROID_SERIAL||'emulator-5580',pkg='local.dingdang.touch';
const checks=[],errors=[];let browser,page,bounds;
function check(message){checks.push(message);console.log(message);fs.writeFileSync('test-results/android-smoke-report.json',JSON.stringify({status:'running',checks,errors},null,2));}
function run(...args){return execFileSync(adb,['-s',serial,...args],{encoding:'utf8',timeout:20000,windowsHide:true}).trim();}
function screen(name){fs.writeFileSync(`test-results/android-${name}.png`,execFileSync(adb,['-s',serial,'exec-out','screencap','-p'],{timeout:20000,windowsHide:true}));}
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
  fs.mkdirSync('test-results',{recursive:true});
  fs.writeFileSync('test-results/android-smoke-report.json',JSON.stringify({status:'running',checks:[],errors:[]}));
  run('shell','am','start','-n',pkg+'/.MainActivity');await connect();
  assert.equal(page.url(),'https://localhost/');
  assert.equal(await page.evaluate(()=>window.Capacitor.isPluginAvailable('GameSave')),true);
  assert.ok(bounds[1]>0&&bounds[3]<640,'WebView must avoid system bars on this 320x640 AVD');
  screen('title-insets');check('bundled https://localhost app loads inside system-bar insets');
  // This emulator is reserved for QA; preserve any earlier test save before resetting it.
  const old=await page.evaluate(()=>localStorage.getItem('dingdang.touch.v2'));
  if(old)fs.writeFileSync('test-results/android-previous-test-save.json',old);
  // Reloading an active game triggers visibility autosave. Leave it first so
  // that resetting the reserved emulator's save cannot be undone on reload.
  if((await state()).active){
    if((await state()).game.pending?.kind==='minigame'){
      if((await state()).game.pending.session.stage==='result')await tap(page.getByRole('button',{name:'领取奖励，返回棋盘',exact:true}));
    }
    if((await state()).game.pending?.kind!=='minigame'&&!await page.locator('#modal').evaluate(el=>el.open))await tap(page.locator('#pause'));
    await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));await page.waitForFunction(()=>!window.__game.snapshot().active);
  }
  await seedSave(null);await page.reload();
  await page.waitForFunction(()=>!!window.__game);
  for(let n=0;n<5;n++){
    await page.reload();await page.waitForFunction(()=>!!window.__game);
    assert.equal(await page.locator('#continueGame').isDisabled(),true);
  }
  check('native save reads survive five consecutive WebView reloads without hanging or reviving a cleared save');
  await tap(page.locator('#soundSettings'));await page.waitForFunction(()=>window.__game.audio().playing&&window.__game.audio().context==='running');
  await page.getByLabel('角色语音',{exact:true}).selectOption('cantonese');await page.getByLabel('音乐音量',{exact:true}).fill('0');assert.equal(await page.evaluate(()=>window.__game.audio().playing),false);
  await page.getByLabel('音乐音量',{exact:true}).fill('45');await tap(page.getByRole('button',{name:'返回',exact:true}));
  run('shell','input','keyevent','KEYCODE_HOME');await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__game.audio().playing),false);
  run('shell','am','start','-n',pkg+'/.MainActivity');await page.waitForFunction(()=>window.__game.audio().playing);check('Android original audio starts on touch; language/volume controls work and background stops music');
  await tap(page.locator('#newGame'));
  await page.locator('#duration').selectOption('30');
  await tap(page.getByRole('button',{name:'开始游戏',exact:true}));
  await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  assert.equal((await state()).game.map,4);screen('portrait-game');
  const {ITEMS}=await import('../app/src/inventory.mjs');
  const stocked=(await state()).game;assert.equal(stocked.players[0].inventory.length,22);
  await tap(page.locator('#items'));
  assert.equal(await page.getByRole('button',{name:/效果待还原/}).count(),0);
  assert.equal(Object.values(ITEMS).filter(i=>i.implemented).length,42);
  const known=stocked.players[0].inventory[0];
  await tap(page.getByRole('button',{name:ITEMS[known].name+' × 1',exact:true}));
  assert.ok((await page.locator('#modalContent').innerText()).includes(ITEMS[known].description));screen('original-inventory');
  await tap(page.getByRole('button',{name:'返回口袋',exact:true}));await tap(page.getByRole('button',{name:'返回游戏',exact:true}));
  assert.deepEqual((await state()).game,stocked);
  check('22-item inventory opens original descriptions and returns by touch without consuming inventory or a turn; all 42 effects enabled');
  const before=(await state()).game.players[0].at;
  await tap(page.locator('#roll'));
  const rolled=await state();assert.equal(rolled.game.players[0].at,before);
  assert.ok(rolled.game.dice>=1&&rolled.game.dice<=6);
  // The die is displayed after native save acknowledgement, not in the same
  // browser task as the touch handler. Observe the UI condition, not a delay.
  await page.locator('#diceDisplay').waitFor({state:'visible'});
  assert.equal((await state()).game.players[0].at,before);
  assert.equal(await page.locator('#diceDisplay').isVisible(),true);
  assert.equal(await page.locator('#roll').isDisabled(),true);
  check('ADB touch rolls a visible die before movement and disables duplicate roll');
  let aiSeen=false,routeTouches=0;
  for(let n=0;n<1800;n++){
    const s=await state();if(s.game.turn!==0)aiSeen=true;
    if(aiSeen&&s.game.turn===0&&s.game.phase==='ready'&&!s.busy)break;
    if(s.game.pending?.kind==='minigame'){
      const stage=s.game.pending.session.stage;
      if(stage==='intro')await tap(page.getByRole('button',{name:'开始小游戏',exact:true}));
      else if(stage==='result')await tap(page.getByRole('button',{name:'领取奖励，返回棋盘',exact:true}));
      await page.waitForTimeout(100);continue;
    }
    if(s.game.players[s.game.turn].control==='human'){
      if(await page.locator('#routes button').count()){await tap(page.locator('#routes button').first());routeTouches++;}
      if(await page.locator('#modal[open]').count()){
        if(s.game.pending?.kind==='minigame'&&s.game.pending.session.stage==='playing'){await page.waitForTimeout(100);continue;}
        const skip=page.getByRole('button',{name:/^(这次先路过|离开商店|离开矿山)$/});
        await tap(await skip.count()?skip:page.locator('#modalContent>button:not(:disabled)').first());
      }
    }
    await page.waitForTimeout(100);
  }
  const s=await state();assert.ok(aiSeen);assert.equal(s.game.turn,0);assert.equal(s.game.phase,'ready');assert.ok(s.game.round>=2);
  check(`human move and three AI turns complete; ${routeTouches} junction buttons touched`);
  const {replayCommands}=await import('../app/src/commands.mjs');
  const map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json'));
  map.jail=JSON.parse(fs.readFileSync('app/public/assets/flow-assets.json')).jail;
  const record=await page.evaluate(()=>window.__game.replay());assert.deepEqual(replayCommands(map,record),s.game);
  check('installed APK command journal reproduces exact game state');
  if(!await page.locator('#modal').evaluate(el=>el.open))await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));await page.waitForFunction(()=>!window.__game.snapshot().active);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dingdang.touch.v2')));
  // Force-stop really kills Android's app process; it is not a page reload.
  run('shell','am','force-stop',pkg);await browser.close();browser=null;
  run('shell','am','start','-n',pkg+'/.MainActivity');
  await connect();await tap(page.locator('#continueGame'));
  await page.waitForFunction(()=>window.__game.snapshot().active);
  assert.deepEqual((await state()).game,saved);screen('resumed-game');
  check('Android force-stop and cold launch resumes exact saved game');
  run('shell','cmd','window','user-rotation','lock','1');
  await page.waitForFunction(()=>innerWidth>innerHeight);readBounds();
  assert.deepEqual((await state()).game,saved);screen('landscape-game');
  await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'继续游戏',exact:true}));
  assert.deepEqual((await state()).game,saved);
  run('shell','cmd','window','user-rotation','lock','0');
  await page.waitForFunction(()=>innerWidth<innerHeight);readBounds();
  check('Android rotation preserves the game; landscape pause/resume is touchable');
  // Every map is loaded from the installed APK, not the development server.
  const maps=[];
  for(let id=0;id<8;id++){
    if(!await page.locator('#modal').evaluate(el=>el.open))await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));await page.waitForFunction(()=>!window.__game.snapshot().active);
    await tap(page.locator('#newGame'));
    await tap(page.getByRole('button',{name:'设置新游戏',exact:true}));
    await page.locator('#mapChoice').selectOption(String(id));
    await tap(page.getByRole('button',{name:'开始游戏',exact:true}));
    await page.waitForFunction(id=>window.__game.snapshot().active&&window.__game.snapshot().game.map===id,id);
    assert.ok((await state()).loaded>200);maps.push(id);
  }
  check('all eight maps and their sprites load from APK assets');
  // A deterministic save fixture isolates the newly recovered effect boundary.
  if(!await page.locator('#modal').evaluate(el=>el.open))await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));await page.waitForFunction(()=>!window.__game.snapshot().active);
  const E=await import('../app/src/engine.mjs');
  const monthly=E.createGame(map,{startDate:'2000-05-01'});monthly.turn=1;for(const p of monthly.players)p.control='human';
  await seedSave(monthly);await page.reload();await page.waitForFunction(()=>!!window.__game);await tap(page.locator('#continueGame'));
  await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  assert.deepEqual((await state()).game.players[1].inventory,['air']);assert.deepEqual((await state()).game.players[2].inventory,[]);
  await tap(page.locator('#items'));await tap(page.getByRole('button',{name:'空气枪 × 1',exact:true}));await tap(page.getByRole('button',{name:'使用道具',exact:true}));await tap(page.getByRole('button',{name:'胖虎',exact:true}));
  await page.waitForFunction(()=>window.__game.snapshot().game.turn===2&&!window.__game.snapshot().busy);
  const afterGift=(await state()).game;assert.deepEqual(afterGift.players[1].inventory,[]);assert.deepEqual(afterGift.players[2].inventory,['original-10','original-19']);
  await tap(page.locator('#items'));
  await page.waitForFunction(()=>document.querySelector('#modal[open] #modalContent')?.textContent.includes('共 2 件'));
  assert.match(await page.locator('#modalContent').innerText(),/共 2 件/);
  assert.equal(await page.getByRole('button',{name:'友情药袋 × 1',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'人见人爱丸 × 1',exact:true}).count(),1);screen('monthly-gifts');
  assert.deepEqual(JSON.parse((await page.evaluate(()=>window.Capacitor.Plugins.GameSave.read())).value),afterGift);
  run('shell','am','force-stop',pkg);await browser.close();browser=null;
  run('shell','am','start','-n',pkg+'/.MainActivity');await connect();await tap(page.locator('#continueGame'));
  await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);assert.deepEqual((await state()).game,afterGift);
  check('first-day gifts arrive at each recipient turn; gifted air is used by ADB touch and Shizuka stock survives cold restart without duplicate grants');
  if(!await page.locator('#modal').evaluate(el=>el.open))await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));await page.waitForFunction(()=>!window.__game.snapshot().active);
  const timed=E.createGame(map,{startDate:'2000-04-03'});
  Object.assign(timed.players[0],{effects:[{id:'charm',source:0,remaining:2},{id:'air',source:1,remaining:1}],effectTickPending:true,effectClockStarted:true,itemSleeping:true});
  await seedSave(timed);
  await page.reload();await page.waitForFunction(()=>!!window.__game);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('dingdang.touch.v2'))),timed);
  await tap(page.locator('#continueGame'));
  await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  const afterTick=(await state()).game;
  assert.equal(afterTick.players[0].itemSleeping,false);assert.deepEqual(afterTick.players[0].effects,[{id:'charm',source:0,remaining:1}]);
  assert.equal(await page.locator('#roll').isEnabled(),true);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('dingdang.touch.v2'))),afterTick);
  await tap(page.locator('#stats'));assert.match(await page.locator('#modalContent').innerText(),/护身符 · 剩余 1/);
  assert.equal(await page.locator('#modal').evaluate(el=>el.scrollTop),0);
  const heading=await page.locator('#modal h2').boundingBox(),dialog=await page.locator('#modal').boundingBox();
  assert.ok(heading.y>=dialog.y&&heading.y+heading.height<=dialog.y+dialog.height);
  screen('effect-status');
  await tap(page.getByRole('button',{name:'返回游戏',exact:true}));
  run('shell','am','force-stop',pkg);await browser.close();browser=null;
  run('shell','am','start','-n',pkg+'/.MainActivity');await connect();await tap(page.locator('#continueGame'));
  await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  assert.deepEqual((await state()).game,afterTick);
  check('timed effects expire before action, show remaining time and survive Android cold restart without a second tick');
  const {originalLandItemNeighbor}=await import('../app/src/land-items.mjs');
  const landRoad=map.cells.findIndex((c,i)=>E.walkable(c)&&map.cells[originalLandItemNeighbor(map,i)]?.event===1),landLot=originalLandItemNeighbor(map,landRoad);
  for(const [id,name] of [['restoreRay','复原光线'],['timeCloth','时间布']]){
    if(!await page.locator('#modal').evaluate(el=>el.open))await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));await page.waitForFunction(()=>!window.__game.snapshot().active);
    const land=E.createGame(map,{startDate:'2000-04-03'});for(const p of land.players)p.control='human';
    land.players[0].at=landRoad;land.players[0].inventory=[id];land.owners[landLot]=1;land.levels[landLot]=4;
    await seedSave(land);
    await page.reload();await page.waitForFunction(()=>!!window.__game);await tap(page.locator('#continueGame'));
    await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
    await tap(page.locator('#items'));await tap(page.getByRole('button',{name:name+' × 1',exact:true}));
    assert.match(await page.locator('#modalContent').innerText(),/目标：大雄的土地/);screen('land-item-'+id);
    await tap(page.getByRole('button',{name:'使用道具',exact:true}));await page.waitForFunction(()=>window.__game.snapshot().game.turn===1&&!window.__game.snapshot().busy);
    const changed=(await state()).game;assert.deepEqual(changed.players[0].inventory,[]);
    const disk=await page.evaluate(()=>window.Capacitor.Plugins.GameSave.read());assert.deepEqual(JSON.parse(disk.value),changed);
    assert.equal(changed.levels[landLot],id==='restoreRay'?3:undefined);assert.equal(changed.owners[landLot],id==='restoreRay'?1:undefined);
    run('shell','am','force-stop',pkg);await browser.close();browser=null;
    run('shell','am','start','-n',pkg+'/.MainActivity');await connect();await tap(page.locator('#continueGame'));
    await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);assert.deepEqual((await state()).game,changed);
    check(name+' ADB touch, land mutation and cold restart preserve the exact state');
  }
  const R=await import('../app/src/road-items.mjs');
  for(const id of ['original-4','original-15','original-16','original-25','original-27','original-30','door','original-13']){
    if(!await page.locator('#modal').evaluate(el=>el.open))await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));await page.waitForFunction(()=>!window.__game.snapshot().active);
    const g=E.createGame(map,{startDate:'2000-04-03'});g.players.forEach(p=>p.control='human');g.players[0].inventory=[id];
    await seedSave(g);await page.reload();await page.waitForFunction(()=>!!window.__game);await tap(page.locator('#continueGame'));
    await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
    await tap(page.locator('#items'));await tap(page.getByRole('button',{name:ITEMS[id].name+' × 1',exact:true}));await tap(page.getByRole('button',{name:'使用道具',exact:true}));
    let target;
    if(id==='door'||id==='original-13'){
      const candidates=map.cells.map((c,i)=>i).filter(i=>R.gameRoadPlacement(map,g,i,id==='door').length);
      const positions=await page.evaluate(ids=>ids.map(i=>({i,...window.__game.cellScreen(i)})),candidates);target=positions.find(p=>p.x>30&&p.x<290&&p.y>170&&p.y<390);assert.ok(target);
      const size=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));run('shell','input','tap',String(Math.round(bounds[0]+target.x*(bounds[2]-bounds[0])/size.w)),String(Math.round(bounds[1]+target.y*(bounds[3]-bounds[1])/size.h)));
    }else if(id!=='original-16')await tap(page.getByRole('button',{name:g.players[1].name,exact:true}));
    await page.waitForFunction(()=>window.__game.snapshot().game.players[0].inventory.length===0&&!window.__game.snapshot().busy);
    const used=(await state()).game;
    if(id==='door'){assert.equal(used.players[0].at,g.players[0].at);assert.equal(used.roadItems[0].at,target.i);}
    if(id==='original-13')assert.equal(used.players[0].at,target.i);
    if(id==='original-30'){assert.equal(used.players[0].at,g.players[1].at);assert.equal(used.players[1].at,g.players[0].at);}
    if(id==='original-4')assert.ok(used.players[1].itemSleeping);
    if(id==='original-25')assert.equal(used.players[1].effects[0].id,id);
    if(id==='original-15'||id==='original-27')assert.equal(used.players[1].effects[0].id,id);
    if(id==='original-16'){assert.equal(used.slowDays,5);assert.equal(used.players[0].effects[0].id,id);}
    screen('item-'+id);
    // A sleeping recipient starts its turn with a modal notice. The board's
    // pause button is intentionally covered; use the notice's save/exit action.
    if(await page.locator('#modal').evaluate(el=>el.open))await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));
    else await tap(page.locator('#pause'));
    const paused=(await state()).game;
    await page.waitForFunction(()=>!window.__game.snapshot().busy);
    await page.waitForFunction(async()=>JSON.parse((await window.Capacitor.Plugins.GameSave.read()).value).turnSerial===window.__game.snapshot().game.turnSerial);
    assert.deepEqual(JSON.parse((await page.evaluate(()=>window.Capacitor.Plugins.GameSave.read())).value),paused);
    run('shell','am','force-stop',pkg);await browser.close();browser=null;run('shell','am','start','-n',pkg+'/.MainActivity');await connect();await tap(page.locator('#continueGame'));await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);assert.deepEqual((await state()).game,paused);
    check(ITEMS[id].name+': ADB target selection, application and exact cold resume');
  }
  const {itemFixture}=await import('./item-fixture.mjs');
  for(const item of ['original-6','original-24','original-32','original-21','original-40','original-41','original-26']){
    const {g,command}=itemFixture(map,item);await loadFixture(g);
    await tap(page.locator('#items'));await tap(page.getByRole('button',{name:ITEMS[item].name+' × 1',exact:true}));await tap(page.getByRole('button',{name:'使用道具',exact:true}));
    if(item==='original-6')await tapCell(command.target);
    if(item==='original-21'){await tapCell(command.target.first);await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('已选第一座'));await tapCell(command.target.second);}
    if(item==='original-26')for(const i of [command.target.donor,command.target.recipient])await tap(page.getByRole('button',{name:g.players[i].name,exact:true}));
    await page.waitForFunction(()=>window.__game.snapshot().visual?.loaded);
    if(item==='original-24'){
      await tap(page.locator('#pause'));await page.waitForFunction(()=>!window.__game.snapshot().busy);const paused=await state();await page.waitForTimeout(150);assert.deepEqual((await state()).visual,paused.visual);
      assert.deepEqual(JSON.parse((await page.evaluate(()=>window.Capacitor.Plugins.GameSave.read())).value),paused.game);await tap(page.getByRole('button',{name:'继续游戏',exact:true}));
    }
    await page.waitForFunction(()=>!window.__game.snapshot().busy&&!window.__game.snapshot().visual&&window.__game.snapshot().game.turn===1,{},{timeout:30000});
    const after=(await state()).game;assert.deepEqual(replayCommands(map,await page.evaluate(()=>window.__game.replay())),after);assert.deepEqual(E.restore(map,JSON.stringify(after)),after);screen('complete-item-'+item);
    check(ITEMS[item].name+': native touch selection, original animation, exact replay and save validity');
  }
  const {mapRegion,insideRegion}=await import('../app/src/map-regions.mjs'),{specialRegionPoint}=await import('../app/src/special-regions.mjs'),{applyEffect}=await import('../app/src/effects.mjs');
  for(const id of [6,7]){
    const b=JSON.parse(fs.readFileSync('app/public/assets/maps/'+id+'.json')),g=E.createGame(b,{startDate:'2000-05-02'}),p=g.players[0];g.players.forEach(p=>p.control='human');
    p.at=b.cells.findIndex(c=>E.walkable(c)&&insideRegion(mapRegion(b,1),c.x,c.y));p.cash=p.bank=0;applyEffect(p,'original-39',1,false);g.phase='landed';await loadFixture(g);
    const entered=(await state()).game;assert.equal(entered.players[0].bonusArea,true);assert.equal(entered.players[0].small,false);assert.match(await page.locator('#modalContent').innerText(),/特殊区域/);
    const exit=specialRegionPoint(b,true);entered.players[0].at=exit.y*b.width+exit.x;entered.phase='landed';entered.pending=null;entered.queue=[];await loadFixture(entered);
    const returned=(await state()).game;assert.equal(returned.players[0].bonusArea,false);assert.equal(b.cells[returned.players[0].at].event,0);
    check('composite map '+id+': small poorest player enters special area and exits to main roads on Android');
  }
  const H=await import('../app/src/time-history.mjs'),hermit=await import('../app/src/hermit.mjs');
  {
    const historical=E.createGame(map,{startDate:'2000-04-03',players:E.CHARACTERS.slice(0,4).map(c=>({character:c.id,control:'human'}))});
    for(let day=2;day<=6;day++){historical.round=day;H.checkpoint(historical);}
    const original=structuredClone(H.oldestCheckpoint(historical));historical.players[0].cash=7000;historical.phase='prompt';historical.pending={kind:'hermit'};
    let found=false;for(let seed=0;seed<10000;seed++){const candidate=structuredClone(historical);candidate.seed=seed;if(hermit.drawHermitEvent(map,candidate,n=>E.random(candidate,n)).id===33){historical.seed=seed;found=true;break;}}assert.ok(found);
    await loadFixture(historical);await tap(page.getByRole('button',{name:'中间的宝箱',exact:true}));await page.waitForFunction(()=>window.__game.snapshot().game.pending?.resume==='ready');
    const rewound=(await state()).game;assert.equal(rewound.round,1);assert.deepEqual(rewound.players,original.players);assert.equal(rewound.history.slots.filter(Boolean).length,0);assert.deepEqual(replayCommands(map,await page.evaluate(()=>window.__game.replay())),rewound);screen('time-machine');
    assert.deepEqual(JSON.parse((await page.evaluate(()=>window.Capacitor.Plugins.GameSave.read())).value),rewound);
    run('shell','am','force-stop',pkg);await browser.close();browser=null;run('shell','am','start','-n',pkg+'/.MainActivity');await connect();await tap(page.locator('#continueGame'));await page.waitForFunction(()=>window.__game.snapshot().game.pending?.resume==='ready');assert.deepEqual((await state()).game,rewound);
    await tap(page.getByRole('button',{name:'继续',exact:true}));await page.waitForFunction(()=>window.__game.snapshot().game.phase==='ready'&&!window.__game.snapshot().busy);
    check('time machine: natural event selection, six-slot rewind, exact native save/cold resume, replay and ready turn return');
  }
  const M=await import('../app/src/minigames.mjs');
  for(const id of [6,2,3,4,5,7,0,1]){
    if(!await page.locator('#modal').evaluate(el=>el.open))await tap(page.locator('#pause'));await tap(page.getByRole('button',{name:'保存并返回主菜单',exact:true}));await page.waitForFunction(()=>!window.__game.snapshot().active);
    const mini=E.createGame(map,{startDate:'2000-04-03'});for(const p of mini.players)p.control='human';
    for(let day=2;day<=6;day++){mini.round=day;H.checkpoint(mini);}
    mini.phase='prompt';mini.pending={kind:'minigame',session:M.createMiniGame(id,mini.players,n=>E.random(mini,n))};
    if(id===0)mini.pending.session.drops.slice(0,4).forEach((d,i)=>Object.assign(d,{x:172+i*100,y:220,kind:0,animation:40,mode:2,age:0,ended:0}));
    await seedSave(mini);await page.reload();await page.waitForFunction(()=>!!window.__game);await tap(page.locator('#continueGame'));
    await tap(page.getByRole('button',{name:'开始小游戏',exact:true}));await page.locator('#miniPause').waitFor();
    if(id===6){
      const p=(await state()).game.pending.session.players[0],left=p.ring[(p.start+6)%14]===p.ring[p.target];
      await tap(page.getByRole('button',{name:mini.players[0].name+'选'+(left?'左':'右'),exact:true}));
    }else if(id===0){
      await page.waitForFunction(()=>window.__game.snapshot().game.pending.session.players[0].score>=1);await page.waitForTimeout(500);
      const b=await page.getByRole('button',{name:mini.players[0].name+'选左',exact:true}).boundingBox(),size=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));
      const x=String(Math.round(bounds[0]+(b.x+b.width/2)*(bounds[2]-bounds[0])/size.w)),y=String(Math.round(bounds[1]+(b.y+b.height/2)*(bounds[3]-bounds[1])/size.h));
      const before=(await state()).game.pending.session.players[0].x;run('shell','input','swipe',x,y,x,y,'500');assert.ok((await state()).game.pending.session.players[0].x<before);
    }else if(id===1){
      // Measure once during the introduction. Repeated geometry queries plus
      // transferring six full history snapshots can miss the response window.
      const positions={},size=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));
      for(const side of ['左','右']){const b=await page.getByRole('button',{name:mini.players[0].name+'选'+side,exact:true}).boundingBox();assert.ok(b);positions[side]=[String(Math.round(bounds[0]+(b.x+b.width/2)*(bounds[2]-bounds[0])/size.w)),String(Math.round(bounds[1]+(b.y+b.height/2)*(bounds[3]-bounds[1])/size.h))];}
      for(let n=0;n<100;n++){
        const s=await page.evaluate(()=>window.__game.snapshot().game.pending.session),p=s.players[0];if(p.score>=1)break;
        assert.notEqual(p.mode,6,'pose player must survive a successful imitation');
        if(s.phase===2&&s.leader.real&&p.mode!==3&&p.mode!==4&&p.pose!==s.leader.pose){
          run('shell','input','tap',...positions[(p.pose^1)===s.leader.pose?'左':'右']);
          await page.waitForFunction(before=>{const p=window.__game.snapshot().game.pending.session.players[0];return p.pose!==before||p.mode===4||p.mode===6;},p.pose,{timeout:1000});
        }
        await page.waitForTimeout(20);
      }
    }else if(id===7){
      const button=page.getByRole('button',{name:mini.players[0].name+'选左',exact:true});
      await button.scrollIntoViewIfNeeded();const b=await button.boundingBox(),size=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));
      const x=String(Math.round(bounds[0]+(b.x+b.width/2)*(bounds[2]-bounds[0])/size.w)),y=String(Math.round(bounds[1]+(b.y+b.height/2)*(bounds[3]-bounds[1])/size.h));
      for(let n=0;n<8;n++){
        if((await state()).game.pending.session.players[0].score>=1)break;
        // Observe the spring on-device; do not spend its timing window on
        // serializing the whole board and measuring an unchanged button.
        await page.waitForFunction(()=>{const p=window.__game.snapshot().game.pending.session.players[0];return p.score>=1||p.mode===8&&!p.armed&&p.spring.age>=5&&p.spring.age<=8;},{},{timeout:10000});
        run('shell','input','tap',x,y);await page.waitForTimeout(300);
      }
    }else if(id===5){
      for(let n=0;n<50;n++){
        const p=(await state()).game.pending.session.players[0];if(p.score>=1)break;
        if(p.actor.mode===2&&p.target.mode===1){const left=(p.selector.choice-p.target.choice+3)%3===1;await tap(page.getByRole('button',{name:mini.players[0].name+'选'+(left?'左':'右'),exact:true}));}
        await page.waitForTimeout(100);
      }
    }else if(id===4){
      // Original hurt frames reject acceleration. ADB delivery can overlap a
      // collision, so observe accepted strokes instead of assuming four taps.
      for(let n=0;n<30&&(await state()).game.pending.session.players[0].score<1;n++){
        await tap(page.getByRole('button',{name:mini.players[0].name+'选左',exact:true}));
        await page.waitForTimeout(100);
      }
    }else for(let n=0;n<(id===2?8:4);n++)await tap(page.getByRole('button',{name:mini.players[0].name+'选'+(n%2?'右':'左'),exact:true}));
    await page.waitForFunction(()=>window.__game.snapshot().game.pending.session.players[0].score>=1);
    await tap(page.locator('#miniPause'));const paused=(await state()).game;await page.waitForTimeout(200);assert.deepEqual((await state()).game,paused);
    assert.deepEqual(JSON.parse((await page.evaluate(()=>window.Capacitor.Plugins.GameSave.read())).value),paused);screen('minigame-'+id);
    run('shell','am','force-stop',pkg);await browser.close();browser=null;run('shell','am','start','-n',pkg+'/.MainActivity');await connect();await tap(page.locator('#continueGame'));
    await page.locator('#miniPause').waitFor();assert.equal(await page.locator('#miniPause').innerText(),'继续小游戏');assert.deepEqual((await state()).game,paused);
    assert.equal(await page.evaluate(()=>window.__game.audio().playing),false,'cold-loaded paused minigame must remain silent');
    await tap(page.locator('#miniPause'));await page.getByRole('button',{name:'领取奖励，返回棋盘',exact:true}).waitFor({timeout:60000});
    const result=(await state()).game,rewards=M.miniRewards(result.pending.session);await tap(page.getByRole('button',{name:'领取奖励，返回棋盘',exact:true}));
    await page.waitForFunction(()=>window.__game.snapshot().game.pending?.kind!=='minigame'&&!window.__game.snapshot().busy);
    assert.equal((await state()).game.players[0].cash,result.players[0].cash+rewards[0]);
    check('minigame '+id+': ADB scoring, pause, exact cold resume, natural completion and reward return');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok((await page.locator('#roll').boundingBox()).width>=44);
  assert.deepEqual(errors,[]);
  assert.deepEqual(await page.evaluate(()=>window.__game.audio().errors),[]);
  check('all eight minigames preserve audio pause on cold resume; no media decode errors');
  const installedPath=run('shell','pm','path',pkg).replace(/^package:/,'');
  const apkSha256=run('shell','sha256sum',installedPath).split(/\s/)[0];
  const builtSha256=createHash('sha256').update(fs.readFileSync('app/android/app/build/outputs/apk/debug/app-debug.apk')).digest('hex');
  assert.equal(apkSha256,builtSha256,'Installed APK must match the current internal build');
  fs.writeFileSync('test-results/android-smoke-report.json',JSON.stringify({status:'passed',apkSha256,device:serial,android:run('shell','getprop','ro.build.version.release'),bounds,checks,errors,limitations:'Android 15 emulator only; not a physical-phone or original Windows runtime equivalence test.'},null,2));
  console.log(JSON.stringify({checks,errors},null,2));await browser.close();
})().catch(async e=>{console.error(e);fs.writeFileSync('test-results/android-smoke-report.json',JSON.stringify({status:'failed',checks,errors:[...errors,String(e)]},null,2));try{screen('failure');run('shell','cmd','window','user-rotation','lock','0');}catch{}if(browser)await browser.close();process.exitCode=1;});
