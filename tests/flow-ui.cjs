const {chromium}=require('../app/node_modules/playwright');
const fs=require('fs'),assert=require('node:assert/strict');let browser;
(async()=>{
  fs.mkdirSync('test-results/pc-front',{recursive:true});
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const E=await import('../app/src/engine.mjs');const map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json'));map.jail=JSON.parse(fs.readFileSync('app/public/assets/flow-assets.json')).jail;
  const errors=[];const checks=[];
  async function pageFor(fixture,viewport={width:915,height:412}){
    const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
    if(fixture)await context.addInitScript(g=>{if(!localStorage.getItem('fixture-seeded')){localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));localStorage.setItem('fixture-seeded','yes');}},fixture);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.TEST_ORIGIN || 'http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);
    await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#newGame').waitFor({state:'visible'});
    if(fixture){
      await page.locator('#continueGame').tap();
      try{await page.waitForFunction(()=>window.__game.snapshot().active);}
      catch(e){await page.screenshot({path:'test-results/pc-front/fixture-resume-failure.png'});fs.writeFileSync('test-results/pc-front/fixture-resume-failure.json',JSON.stringify({fixture,errors,state:await page.evaluate(()=>window.__game.snapshot()),body:await page.locator('body').innerText()},null,2));throw e;}
      await page.waitForTimeout(100);
    }
    return {context,page};
  }
  const snapshot=page=>page.evaluate(()=>window.__game.snapshot());
  async function tapPaged(page,name){
    const button=page.getByRole('button',{name,exact:true});
    for(let n=0;n<12&&!await button.isVisible();n++){
      const next=page.getByRole('button',{name:'下一页',exact:true});assert.ok(await next.isEnabled(),'missing action: '+name);await next.tap();
    }
    await button.tap();
  }
  const fixture=()=>E.createGame(map,{seed:72,startDate:'2000-04-03',players:[{character:'doraemon',control:'human'},{character:'nobita',control:'human'},{character:'shizuka',control:'human'},{character:'gian',control:'human'}]});
  function adjacent(event){const lot=map.cells.findIndex(c=>c.event===event&&E.adjacent(map,c.y*50+c.x).some(i=>E.walkable(map.cells[i])));return {lot,road:E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]))};}
  const first=await pageFor();const {context,page}=first;
  await page.screenshot({path:'test-results/pc-front/flow-title.png'});assert.equal(await page.locator('#continueGame').isDisabled(),true);
  await page.locator('#newGame').tap();await page.locator('#character0').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change'));},'suneo');await page.locator('#character1').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change'));},'suneo');
  await page.getByRole('button',{name:'确定角色',exact:true}).tap();await page.getByRole('button',{name:'确定地图',exact:true}).tap();await page.getByRole('button',{name:'开始游戏',exact:true}).tap();assert.match(await page.locator('#setupError').textContent(),/不同角色/);
  await page.locator('#character1').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change'));},'nobita');await page.getByRole('button',{name:'2 年',exact:true}).tap();
  await page.setViewportSize({width:412,height:915});await page.locator('#modal').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:'test-results/pc-front/flow-setup.png'});
  await page.setViewportSize({width:915,height:412});
  await page.getByRole('button',{name:'开始游戏',exact:true}).tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  let s=await snapshot(page);assert.equal(s.game.players[0].character,'suneo');assert.equal(s.game.players[0].cash,2000);assert.equal(s.game.players.filter(p=>p.control==='ai').length,3);checks.push('title, six-character setup, duplicate prevention, one human + three AI');
  const cdp=await context.newCDPSession(page);const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y,radiusX:5,radiusY:5}))});
  const tappedCell=s.game.players[0].at,tapPoint=await page.evaluate(i=>window.__game.cellScreen(i),tappedCell),tapCamera=s.camera;
  await touch('touchStart',[[0,tapPoint.x,tapPoint.y]]);await touch('touchMove',[[0,tapPoint.x+3,tapPoint.y+4]]);await touch('touchEnd',[]);
  s=await snapshot(page);assert.deepEqual(s.camera,tapCamera);assert.equal(s.selected,tappedCell);
  await page.getByRole('button',{name:'关闭地块信息',exact:true}).tap();checks.push('small finger movement remains a tap on the intended cell without panning');
  const before=s.camera;await touch('touchStart',[[0,180,150]]);await touch('touchMove',[[0,250,170]]);await touch('touchEnd',[]);s=await snapshot(page);assert.notEqual(s.camera.x,before.x);assert.equal(s.selected,-1);
  await touch('touchStart',[[0,160,170],[1,300,170]]);await touch('touchMove',[[0,120,170],[1,340,170]]);await touch('touchEnd',[]);assert.ok((await snapshot(page)).camera.z>before.z);
  await touch('touchStart',[[0,160,170]]);await touch('touchCancel',[]);assert.equal((await snapshot(page)).selected,-1);checks.push('real touch pan, pinch and cancellation');
  await page.locator('#home').tap();await page.locator('#roll').tap();
  const rolled=await snapshot(page),rollAt=rolled.game.players[0].at;
  assert.equal(await page.locator('#diceDisplay').isVisible(),true);
  assert.equal(await page.locator('#roll').isDisabled(),true);
  await page.waitForTimeout(200);
  assert.equal((await snapshot(page)).game.players[0].at,rollAt);
  await page.screenshot({path:'test-results/pc-front/dice-before-walking.png'});
  checks.push('visible dice precedes movement and blocks duplicate rolls');
  await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active);
  const resumedRoll=await snapshot(page);
  assert.equal(resumedRoll.game.dice,rolled.game.dice);assert.equal(resumedRoll.game.seed,rolled.game.seed);
  assert.equal(resumedRoll.game.players[0].at,rollAt);
  assert.equal(await page.locator('#diceDisplay').isVisible(),true);
  checks.push('reload during dice replays the saved result without rerolling or walking early');
  const turnTrace=[];let aiSeen=false;for(let n=0;n<1800;n++){
    await page.waitForTimeout(100);s=await snapshot(page);if(s.game.turn!==0)aiSeen=true;
    const stage=JSON.stringify({turn:s.game.turn,phase:s.game.phase,pending:s.game.pending?.kind,remaining:s.game.remaining});
    if(turnTrace.at(-1)?.stage!==stage)turnTrace.push({n,stage,log:s.game.log.slice(-2)});
    if(n%20===0)fs.writeFileSync('test-results/pc-front/current-turn.json',JSON.stringify({n,busy:s.busy,paused:s.paused,active:s.active,game:s.game,trace:turnTrace,buttons:await page.getByRole('button').allTextContents()},null,2));
    if(aiSeen&&s.game.turn===0&&s.game.phase==='ready'&&!s.busy)break;
    if(s.game.pending?.kind==='minigame'){
      if(s.game.pending.session.stage==='intro')await page.getByRole('button',{name:'开始小游戏',exact:true}).tap();
      else if(s.game.pending.session.stage==='result')await page.getByRole('button',{name:'领取奖励，返回棋盘',exact:true}).tap();
      continue;
    }
    if(s.game.players[s.game.turn].control==='human'){
      if(await page.locator('#routes button').count())await page.locator('#routes button').first().tap();
      if(await page.locator('#modal[open]').count()){
        const next=await snapshot(page);
        const labels={shop:'离开商店',bank:'离开矿山',destination:'这次先路过',buy:'这次先路过',upgrade:'这次先路过',property:'这次先路过',notice:'继续',monthly:'确认月结，继续游戏',hermit:'中间的宝箱'};
        const label=labels[next.game.pending?.kind];
        assert.ok(label,'unhandled human prompt: '+JSON.stringify(next.game.pending));
        await page.getByRole('button',{name:label,exact:true}).tap();
      }
    }
  }
  s=await snapshot(page);fs.writeFileSync('test-results/pc-front/round-trip.json',JSON.stringify({trace:turnTrace,game:s.game},null,2));assert.ok(aiSeen);assert.equal(s.game.turn,0);assert.equal(s.game.phase,'ready');assert.ok(s.game.round>=2);assert.equal(await page.locator('#modal[open]').count(),0);checks.push('AI completes all three turns without requiring human clicks');
  const {replayCommands}=await import('../app/src/commands.mjs');
  const captured=await page.evaluate(()=>({record:window.__game.replay(),game:window.__game.snapshot().game}));
  const replayMap=captured.game.mapRevision==='pc-v126'?JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json')):map;
  assert.deepEqual(replayCommands(replayMap,captured.record),captured.game);checks.push('actual human touch and AI command journal replays to the exact visible state');
  await page.screenshot({path:'test-results/pc-front/flow-landscape.png'});
  await page.locator('#pause').tap();await page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();const saved=(await snapshot(page)).game;
  await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active);assert.deepEqual((await snapshot(page)).game,saved);checks.push('save to title, reload, resume exact game');
  await page.setViewportSize({width:412,height:915});await page.waitForTimeout(200);await page.screenshot({path:'test-results/pc-front/flow-portrait.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok((await page.locator('#roll').boundingBox()).width>=44);await context.close();
  // Purchase is still pending after restart; executing it once cannot charge twice.
  const buy=fixture(),site=adjacent(1);buy.players[0].at=site.road;buy.phase='prompt';buy.pending={kind:'buy',lot:site.lot};
  const b=await pageFor(buy);await b.page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();await b.page.reload();await b.page.waitForFunction(()=>!!window.__game);await b.page.locator('#titleGate').tap();await b.page.getByRole('button',{name:'大富翁',exact:true}).tap();await b.page.locator('#continueGame').tap();await b.page.waitForFunction(()=>window.__game.snapshot().active);await b.page.getByRole('button',{name:'购买地块',exact:true}).tap();await b.page.waitForFunction(()=>window.__game.snapshot().game.turn===1);
  s=await snapshot(b.page);assert.equal(s.game.owners[site.lot],0);assert.equal(s.game.players[0].cash,1000-E.landPrice(map.cells[site.lot]));checks.push('purchase prompt survives reload and charges once');await b.context.close();
  const shopGame=fixture(),shopSite=adjacent(5);shopGame.players[0].at=shopSite.road;shopGame.players[0].inventory=['air'];shopGame.phase='prompt';shopGame.pending={kind:'shop',lot:shopSite.lot};
  const sh=await pageFor(shopGame,{width:412,height:915});
  await sh.page.getByRole('button',{name:'购买道具',exact:true}).tap();
  assert.equal(await sh.page.getByRole('button',{name:/^购买 空气枪/}).count(),0);
  await sh.page.getByRole('button',{name:'返回商店',exact:true}).tap();
  await sh.page.getByRole('button',{name:'卖出道具',exact:true}).tap();
  await tapPaged(sh.page,'卖出 空气枪 · 获得 100');
  assert.equal((await snapshot(sh.page)).game.players[0].cash,1100);
  await sh.page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();await sh.page.reload();await sh.page.waitForFunction(()=>!!window.__game);await sh.page.locator('#titleGate').tap();await sh.page.getByRole('button',{name:'大富翁',exact:true}).tap();await sh.page.locator('#continueGame').tap();await sh.page.waitForFunction(()=>window.__game.snapshot().active);
  assert.equal(await sh.page.getByRole('button',{name:/^卖出 空气枪/}).count(),0);
  assert.equal(await sh.page.getByRole('button',{name:'卖出道具',exact:true}).isDisabled(),true);
  await sh.page.getByRole('button',{name:'购买道具',exact:true}).tap();
  await tapPaged(sh.page,'购买 护身符 · 80 豆沙包');assert.equal((await snapshot(sh.page)).game.players[0].cash,1020);
  await sh.page.screenshot({path:'test-results/pc-front/shop-touch.png'});await sh.page.getByRole('button',{name:'离开商店',exact:true}).tap();
  await sh.page.waitForFunction(()=>window.__game.snapshot().game.turn===1);checks.push('map shop stock, original prices, sale and reload without reselling an absent item');await sh.context.close();
  const voluntary=fixture(),propertySite=adjacent(1);voluntary.players[0].at=propertySite.road;voluntary.owners[propertySite.lot]=0;voluntary.levels[propertySite.lot]=4;voluntary.phase='prompt';voluntary.pending={kind:'property',lot:propertySite.lot};
  const vs=await pageFor(voluntary);assert.equal(await vs.page.getByRole('button',{name:'升级建筑',exact:true}).isDisabled(),true);
  await vs.page.screenshot({path:'test-results/pc-front/property-management.png'});
  const recovered=E.saleValue(map,voluntary,propertySite.lot);
  await vs.page.getByRole('button',{name:'出售地产 · 获得 '+recovered,exact:true}).tap();await vs.page.waitForFunction(()=>window.__game.snapshot().game.turn===1);
  const afterSale=(await snapshot(vs.page)).game;assert.equal(afterSale.owners[propertySite.lot],undefined);assert.equal(afterSale.players[0].cash,Math.fround(1000+recovered));checks.push('maximum-level property can be voluntarily sold by touch without debt');await vs.context.close();
  const bank=fixture(),mine=adjacent(6);bank.players[0].at=mine.road;bank.phase='prompt';bank.pending={kind:'bank',lot:mine.lot};const bn=await pageFor(bank);
  await bn.page.getByRole('slider',{name:'矿山存取比例'}).fill('25');assert.equal((await snapshot(bn.page)).game.players[0].cash,1000);await bn.page.getByRole('button',{name:'确认存取',exact:true}).tap();await bn.page.waitForFunction(()=>window.__game.snapshot().game.turn===1);assert.equal((await snapshot(bn.page)).game.players[0].cash,500);checks.push('bank slider preview, transfer confirmation and returning to the game');await bn.context.close();
  const stocked=fixture(),pocket=await pageFor(stocked,{width:320,height:592});
  const stockBefore=(await snapshot(pocket.page)).game;assert.equal(stockBefore.players[0].inventory.length,22);
  await pocket.page.locator('#items').tap();assert.equal(await pocket.page.locator('#modal').evaluate(el=>el.scrollTop),0);
  assert.equal(await pocket.page.getByRole('button',{name:/效果待还原/}).count(),0);
  assert.equal(Object.values(E.ITEMS).filter(i=>i.implemented).length,42);
  const known=stocked.players[0].inventory[0];await pocket.page.getByRole('button',{name:E.ITEMS[known].name+' × 1',exact:true}).tap();
  assert.ok((await pocket.page.locator('#modalContent').innerText()).includes(E.ITEMS[known].description));
  await pocket.page.screenshot({path:'test-results/pc-front/inventory-original-description.png'});
  await pocket.page.getByRole('button',{name:'返回口袋',exact:true}).tap();
  await pocket.page.getByRole('button',{name:'返回游戏',exact:true}).tap();assert.deepEqual((await snapshot(pocket.page)).game,stockBefore);
  await pocket.page.reload();await pocket.page.waitForFunction(()=>!!window.__game);await pocket.page.locator('#titleGate').tap();await pocket.page.getByRole('button',{name:'大富翁',exact:true}).tap();await pocket.page.locator('#continueGame').tap();await pocket.page.waitForFunction(()=>window.__game.snapshot().active);await pocket.page.waitForFunction(()=>window.__game.snapshot().active);
  assert.deepEqual((await snapshot(pocket.page)).game,stockBefore);
  checks.push('22-item original starting inventory scrolls on a narrow touch screen; all effects have descriptions and reload retains stock');await pocket.context.close();
  const monthly=fixture();monthly.startDate='2000-05-01';monthly.turn=1;
  const mg=await pageFor(monthly,{width:320,height:592});await mg.page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  assert.deepEqual((await snapshot(mg.page)).game.players[1].inventory,['air']);
  assert.deepEqual((await snapshot(mg.page)).game.players[2].inventory,[]);
  await mg.page.locator('#items').tap();await mg.page.getByRole('button',{name:'空气枪 × 1',exact:true}).tap();await mg.page.getByRole('button',{name:'使用道具',exact:true}).tap();await mg.page.getByRole('button',{name:'胖虎',exact:true}).tap();
  await mg.page.waitForFunction(()=>window.__game.snapshot().game.turn===2&&!window.__game.snapshot().busy);
  const afterGift=(await snapshot(mg.page)).game;assert.deepEqual(afterGift.players[1].inventory,[]);assert.deepEqual(afterGift.players[2].inventory,['original-10','original-19']);
  await mg.page.locator('#items').tap();assert.match(await mg.page.locator('#modalContent').innerText(),/共 2 件/);
  assert.equal(await mg.page.getByRole('button',{name:'友情药袋 × 1',exact:true}).count(),1);assert.equal(await mg.page.getByRole('button',{name:'人见人爱丸 × 1',exact:true}).count(),1);
  await mg.page.screenshot({path:'test-results/pc-front/monthly-gifts-pocket.png'});await mg.page.getByRole('button',{name:'返回游戏',exact:true}).tap();
  await mg.page.locator('#pause').tap();await mg.page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();
  await mg.page.reload();await mg.page.waitForFunction(()=>!!window.__game);await mg.page.locator('#titleGate').tap();await mg.page.getByRole('button',{name:'大富翁',exact:true}).tap();await mg.page.locator('#continueGame').tap();await mg.page.waitForFunction(()=>window.__game.snapshot().active);
  await mg.page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);assert.deepEqual((await snapshot(mg.page)).game,afterGift);
  checks.push('Nobita first-day gift can be used by touch; Shizuka then receives two original items exactly once across reload');await mg.context.close();
  const item=fixture();item.seed=1500;item.players[0].inventory=['air'];const it=await pageFor(item);await it.page.locator('#items').tap();await it.page.getByRole('button',{name:'空气枪 × 1',exact:true}).tap();await it.page.getByRole('button',{name:'使用道具',exact:true}).tap();await it.page.getByRole('button',{name:'大雄',exact:true}).tap();
  await it.page.waitForFunction(()=>window.__game.snapshot().game.pending?.kind==='notice');assert.match((await snapshot(it.page)).game.pending.text,/休息/);assert.equal((await snapshot(it.page)).game.players[0].inventory.length,0);checks.push('item targeting consumes turn and opponent rests');await it.context.close();
  const {originalLandItemNeighbor}=await import('../app/src/land-items.mjs');
  const landRoad=map.cells.findIndex((c,i)=>E.walkable(c)&&map.cells[originalLandItemNeighbor(map,i)]?.event===1),landLot=originalLandItemNeighbor(map,landRoad);
  for(const [id,name] of [['restoreRay','复原光线'],['timeCloth','时间布']]){
    const fixtureLand=fixture();fixtureLand.players[0].at=landRoad;fixtureLand.players[0].inventory=[id];fixtureLand.owners[landLot]=1;fixtureLand.levels[landLot]=4;
    const li=await pageFor(fixtureLand,{width:320,height:592});await li.page.locator('#items').tap();await li.page.getByRole('button',{name:name+' × 1',exact:true}).tap();
    assert.match(await li.page.locator('#modalContent').innerText(),/目标：大雄的土地/);
    await li.page.screenshot({path:'test-results/pc-front/land-item-'+id+'.png'});await li.page.getByRole('button',{name:'使用道具',exact:true}).tap();
    await li.page.waitForFunction(()=>window.__game.snapshot().game.turn===1);const actual=(await snapshot(li.page)).game;
    assert.equal(actual.players[0].inventory.length,0);assert.equal(actual.levels[landLot],id==='restoreRay'?3:undefined);
    assert.equal(actual.owners[landLot],id==='restoreRay'?1:undefined);
    await li.page.reload();await li.page.waitForFunction(()=>!!window.__game);await li.page.locator('#titleGate').tap();await li.page.getByRole('button',{name:'大富翁',exact:true}).tap();await li.page.locator('#continueGame').tap();await li.page.waitForFunction(()=>window.__game.snapshot().active);assert.deepEqual((await snapshot(li.page)).game,actual);
    checks.push(name+' touch target, use and saved land mutation');await li.context.close();
  }
  const own=fixture();own.players[0].at=landRoad;own.players[0].inventory=['timeCloth'];own.owners[landLot]=0;own.levels[landLot]=4;
  const invalidLand=await pageFor(own);await invalidLand.page.locator('#items').tap();await invalidLand.page.getByRole('button',{name:'时间布 × 1',exact:true}).tap();
  assert.match(await invalidLand.page.locator('#modalContent').innerText(),/不能用于自己的土地/);assert.equal(await invalidLand.page.getByRole('button',{name:'使用道具',exact:true}).isDisabled(),true);
  assert.deepEqual((await snapshot(invalidLand.page)).game.players[0].inventory,['timeCloth']);checks.push('time cloth rejects own property before consuming inventory');await invalidLand.context.close();
  const charm=fixture();charm.players[0].inventory=['charm'];charm.players[0].effects=[{id:'charm',source:0,remaining:2}];charm.players[0].effectTickPending=true;charm.players[0].effectClockStarted=true;
  const timed=await pageFor(charm,{width:320,height:592});assert.equal((await snapshot(timed.page)).game.players[0].effects[0].remaining,1);
  await timed.page.locator('#stats').tap();assert.match(await timed.page.locator('#modalContent').innerText(),/护身符 · 剩余 1/);
  assert.equal(await timed.page.locator('#modal').evaluate(el=>el.scrollTop),0);
  const titleBox=await timed.page.locator('#modal h2').boundingBox(),modalBox=await timed.page.locator('#modal').boundingBox();assert.ok(titleBox.y>=modalBox.y&&titleBox.y+titleBox.height<=modalBox.y+modalBox.height);
  await timed.page.screenshot({path:'test-results/pc-front/effect-status.png'});await timed.page.getByRole('button',{name:'返回游戏',exact:true}).tap();
  await timed.page.locator('#items').tap();await timed.page.getByRole('button',{name:'护身符 × 1',exact:true}).tap();assert.equal(await timed.page.getByRole('button',{name:'使用道具',exact:true}).isDisabled(),true);
  for(let n=0;n<2;n++){await timed.page.reload();await timed.page.waitForFunction(()=>!!window.__game);await timed.page.locator('#titleGate').tap();await timed.page.getByRole('button',{name:'大富翁',exact:true}).tap();await timed.page.locator('#continueGame').tap();await timed.page.waitForFunction(()=>window.__game.snapshot().active);assert.equal((await snapshot(timed.page)).game.players[0].effects[0].remaining,1);}
  checks.push('timed charm status is visible, cannot be refreshed and is not decremented by repeated reloads');await timed.context.close();
  const waking=fixture();waking.players[0].effects=[{id:'air',source:1,remaining:1}];waking.players[0].itemSleeping=true;waking.players[0].effectTickPending=true;waking.players[0].effectClockStarted=true;
  const wake=await pageFor(waking);const awake=(await snapshot(wake.page)).game;
  assert.equal(awake.players[0].itemSleeping,false);assert.deepEqual(awake.players[0].effects,[]);assert.equal(await wake.page.locator('#roll').isEnabled(),true);
  assert.deepEqual(await wake.page.evaluate(()=>JSON.parse(localStorage.getItem('dingdang.touch.v2'))),awake);
  await wake.page.reload();await wake.page.waitForFunction(()=>!!window.__game);await wake.page.locator('#titleGate').tap();await wake.page.getByRole('button',{name:'大富翁',exact:true}).tap();await wake.page.locator('#continueGame').tap();await wake.page.waitForFunction(()=>window.__game.snapshot().active);assert.deepEqual((await snapshot(wake.page)).game,awake);
  checks.push('air-gun expiry wakes the player before rolling and is saved while waiting for input');await wake.context.close();
  const debt=fixture();debt.players[0].cash=0;debt.players[0].bank=20;debt.owners[site.lot]=0;debt.levels[site.lot]=0;debt.phase='prompt';debt.pending={kind:'debt',amount:20+E.saleValue(map,debt,site.lot),creditor:1,text:'支付租金'};const db=await pageFor(debt);
  await db.page.getByRole('button',{name:'从矿山提取欠缺金额',exact:true}).tap();await db.page.getByRole('button',{name:/^出售 /}).tap();await db.page.screenshot({path:'test-results/pc-front/flow-debt.png'});await db.page.getByRole('button',{name:'支付 '+debt.pending.amount,exact:true}).tap();await db.page.waitForFunction(()=>window.__game.snapshot().game.turn===1);assert.equal((await snapshot(db.page)).game.players[0].cash,0);checks.push('debt withdraw, property sale and final payment');await db.context.close();
  const finish=fixture();finish.players[1].eliminated=true;finish.players[2].eliminated=true;finish.players[0].cash=0;finish.players[0].bank=0;finish.phase='prompt';finish.pending={kind:'debt',amount:1,creditor:3,text:'最后一笔租金'};const end=await pageFor(finish);
  await end.page.getByRole('button',{name:'资产不足，确认破产',exact:true}).tap();await end.page.getByRole('heading',{name:/游戏结束.*胖虎获胜/}).waitFor();await end.page.screenshot({path:'test-results/pc-front/flow-results.png'});assert.deepEqual((await snapshot(end.page)).game.winners,[3]);await end.page.getByRole('button',{name:'返回主菜单',exact:true}).tap();assert.equal(await end.page.locator('#titleScreen').isVisible(),true);checks.push('bankruptcy, winner result and return to title');await end.context.close();
  const paused=fixture();paused.turn=1;paused.players[1].control='ai';const pa=await pageFor(paused);await pa.page.locator('#pause').tap();await pa.page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();const frozen=(await snapshot(pa.page)).game;await pa.page.waitForTimeout(1000);assert.deepEqual((await snapshot(pa.page)).game,frozen);checks.push('pausing and leaving during AI cannot mutate the saved game in the background');await pa.context.close();
  const fortune=fixture();fortune.phase='prompt';fortune.pending={kind:'hermit',lucky:1};const he=await pageFor(fortune);await he.page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();await he.page.reload();await he.page.waitForFunction(()=>!!window.__game);await he.page.locator('#titleGate').tap();await he.page.getByRole('button',{name:'大富翁',exact:true}).tap();await he.page.locator('#continueGame').tap();await he.page.waitForFunction(()=>window.__game.snapshot().active);await he.page.getByRole('button',{name:'中间的宝箱',exact:true}).tap();const expected=structuredClone(fortune);E.answer(map,expected,'chest',1);assert.equal((await snapshot(he.page)).game.players[0].cash,expected.players[0].cash);await he.page.getByRole('button',{name:'继续',exact:true}).tap();await he.page.waitForFunction(()=>window.__game.snapshot().game.turn===1);checks.push('hermit choice survives reload, awards once and returns to the turn loop');await he.context.close();
  const buildings=fixture();buildings.players[0].at=site.road;buildings.owners[site.lot]=0;buildings.levels[site.lot]=4;const bu=await pageFor(buildings);await bu.page.screenshot({path:'test-results/pc-front/flow-building.png'});checks.push('original fifth-level property artwork renders');await bu.context.close();
  const lost=E.createGame(map,{startDate:'2000-04-03'});lost.players[0].cash=0;lost.players[0].bank=0;lost.phase='prompt';lost.pending={kind:'debt',amount:1,creditor:1,text:'租金'};const lo=await pageFor(lost);await lo.page.getByRole('button',{name:'资产不足，确认破产',exact:true}).tap();await lo.page.getByRole('heading',{name:'真人玩家已破产',exact:true}).waitFor();assert.equal((await snapshot(lo.page)).game.phase,'end');await lo.page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();assert.equal((await snapshot(lo.page)).active,false);checks.push('eliminated human gets spectator or return-to-title choice');await lo.context.close();
  assert.deepEqual(errors,[]);fs.writeFileSync('test-results/pc-front/flow-ui-report.json',JSON.stringify({passed:true,checks,errors,androidDeviceTested:false},null,2));console.log('Flow UI checks passed: '+checks.length);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});


