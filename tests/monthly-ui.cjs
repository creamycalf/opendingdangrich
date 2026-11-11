const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
 const E=await import('../app/src/engine.mjs'),C=await import('../app/src/commands.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json'));const checks=[],errors=[];
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const converter of [false,true]){
  const g=E.createGame(map,{startDate:'2000-04-30'});g.players.forEach(p=>p.control='human');g.players[0].walkPoints=12;g.players[0].inventory=['original-5','original-5'];g.owners[map.cells.findIndex(c=>c.event===1)]=0;g.levels[Object.keys(g.owners)[0]]=4;
  if(!converter){g.turn=3;g.phase='end';E.nextTurn(map,g);}
  const context=await browser.newContext({viewport:{width:320,height:592},isMobile:true,hasTouch:true});await context.addInitScript(g=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));}},g);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();
  if(converter){await page.locator('#items').tap();await page.getByRole('button',{name:'日期转换仪 × 2',exact:true}).tap();await page.getByRole('button',{name:'使用道具',exact:true}).tap();}
  const ok=page.getByRole('button',{name:'确认月结，继续游戏',exact:true});await ok.waitFor();
  const snap=()=>page.evaluate(()=>window.__game.snapshot().game),settled=await snap();assert.equal(settled.pending.kind,'monthly');assert.equal(await page.evaluate(()=>window.__game.audio().track),9);
  const box=await ok.boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'test-results/monthly-'+(converter?'converter':'normal')+'.png'});
  await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();await ok.waitFor();assert.deepEqual(await snap(),settled);
  await ok.tap();await page.waitForFunction(()=>window.__game.snapshot().game.phase==='ready'&&!window.__game.snapshot().busy);const result=await snap();assert.deepEqual(result.players.map(p=>p.cash),settled.players.map(p=>p.cash));
  const replay=await page.evaluate(()=>window.__game.replay());assert.deepEqual(C.replayCommands(map,replay),result);
  checks.push((converter?'date converter':'regular month end')+': 320px touch, music, saved settlement, no duplicate payment and replay');await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/monthly-ui-report.json',JSON.stringify({checks,errors},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exit(1);});
