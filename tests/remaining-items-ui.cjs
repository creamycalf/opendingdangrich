const {chromium}=require('../app/node_modules/playwright');const fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
 const E=await import('../app/src/engine.mjs'),R=await import('../app/src/road-items.mjs'),C=await import('../app/src/commands.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json')),checks=[],errors=[];
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const item of ['original-3','original-6','original-24','original-32']){
  const g=E.createGame(map,{startDate:'2000-05-02'});g.players.forEach(p=>p.control='human');g.players[0].inventory=[item];
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(g=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));}},g);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();
  const use=async()=>{await page.locator('#items').tap();await page.getByRole('button',{name:E.ITEMS[item].name+' × 1',exact:true}).tap();await page.getByRole('button',{name:'使用道具',exact:true}).tap();};await use();
  if(item==='original-3')await page.getByRole('button',{name:g.players[1].name,exact:true}).tap();
  if(item==='original-6'){
   await page.getByRole('button',{name:'取消选位置',exact:true}).tap();assert.deepEqual(await page.evaluate(()=>window.__game.snapshot().game),g);await use();
   const c=map.cells[g.players[0].at],at=map.cells.flatMap((x,i)=>R.gameRoadPlacement(map,g,i).length?[i]:[]).sort((a,b)=>Math.abs(map.cells[a].x-c.x)+Math.abs(map.cells[a].y-c.y)-Math.abs(map.cells[b].x-c.x)-Math.abs(map.cells[b].y-c.y))[0],p=await page.evaluate(i=>window.__game.cellScreen(i),at);await page.touchscreen.tap(p.x,p.y);
  }
  await page.waitForFunction(()=>window.__game.snapshot().game.turn===1&&!window.__game.snapshot().busy);const after=await page.evaluate(()=>window.__game.snapshot().game);assert.deepEqual(after.players[0].inventory,[]);assert.deepEqual(C.replayCommands(map,await page.evaluate(()=>window.__game.replay())),after);
  if(item==='original-6')assert.equal(after.roadItems[0].id,item);else assert.ok(after.players[0].effects.some(e=>e.id===item));
  await page.screenshot({path:'test-results/'+item+'-touch-rules25.png'});await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();assert.deepEqual(await page.evaluate(()=>window.__game.snapshot().game),after);checks.push(item+': touch use, save, replay, rendering');await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/remaining-items-ui-report.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
