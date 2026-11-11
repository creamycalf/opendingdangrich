const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
  const E=await import('../app/src/engine.mjs'),R=await import('../app/src/road-items.mjs'),C=await import('../app/src/commands.mjs');
  const map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json'));browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const checks=[],errors=[];
  for(const item of ['door','original-13']){
    const g=E.createGame(map,{startDate:'2000-05-02'});g.players.forEach(p=>p.control='human');g.players[0].inventory=[item];
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(g=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));}},g);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();
    const name=E.ITEMS[item].name;const open=async()=>{await page.locator('#items').tap();await page.getByRole('button',{name:name+' × 1',exact:true}).tap();await page.getByRole('button',{name:'使用道具',exact:true}).tap();};
    await open();await page.getByRole('button',{name:'取消选位置',exact:true}).tap();assert.deepEqual((await page.evaluate(()=>window.__game.snapshot())).game,g);
    await open();const positions=await page.evaluate(()=>window.__game.snapshot().game.players.map(p=>window.__game.cellScreen(p.at)));
    const before=g.players[0].at;await page.touchscreen.tap(positions[0].x,positions[0].y);assert.deepEqual((await page.evaluate(()=>window.__game.snapshot())).game,g);
    const candidates=map.cells.map((c,i)=>i).filter(i=>R.gameRoadPlacement(map,g,i,item==='door').length);
    const shown=await page.evaluate(ids=>ids.map(i=>({i,...window.__game.cellScreen(i)})),candidates),target=shown.find(p=>p.x>45&&p.x<345&&p.y>250&&p.y<610);assert.ok(target,'at least one nearby legal square is visible');
    await page.touchscreen.tap(target.x,target.y);await page.waitForFunction(()=>window.__game.snapshot().game.turn===1&&!window.__game.snapshot().busy);
    const result=(await page.evaluate(()=>window.__game.snapshot())).game;assert.deepEqual(result.players[0].inventory,[]);
    if(item==='door'){assert.equal(result.players[0].at,before);assert.equal(result.roadItems[0].at,target.i);assert.equal(result.roadItems[0].remaining,5);}else assert.equal(result.players[0].at,target.i);
    const replay=await page.evaluate(()=>window.__game.replay());assert.deepEqual(C.replayCommands(map,replay),result);
    await page.screenshot({path:'test-results/road-'+item+'.png'});await page.locator('#pause').tap();await page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();assert.deepEqual((await page.evaluate(()=>window.__game.snapshot())).game,result);
    checks.push(name+': touch selection, cancel, occupancy rejection, save/resume and exact replay');await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('test-results/road-items-ui-report.json',JSON.stringify({checks,errors},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exit(1);});
