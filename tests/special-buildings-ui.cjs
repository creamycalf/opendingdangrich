const {chromium}=require('../app/node_modules/playwright');const fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
 const E=await import('../app/src/engine.mjs'),L=await import('../app/src/land-items.mjs'),C=await import('../app/src/commands.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json')),checks=[],errors=[];
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 async function open(g){const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(g=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));}},g);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();return {context,page};}
 const snapshot=page=>page.evaluate(()=>window.__game.snapshot().game);
 const fixture=kind=>{const g=E.createGame(map,{startDate:'2000-05-02'});g.players.forEach(p=>p.control='human');const at=map.cells.findIndex((c,i)=>E.walkable(c)&&c.event===0&&map.cells[L.originalLandItemNeighbor(map,i)]?.event===1),lot=L.originalLandItemNeighbor(map,at);g.players[0].at=at;g.owners[lot]=0;g.levels[lot]=kind?1:0;g.kinds[lot]=kind;return {g,lot};};
 for(const item of ['original-40','original-41']){
  const {g,lot}=fixture(0);g.players[0].inventory=[item];const {context,page}=await open(g);
  await page.locator('#items').tap();await page.getByRole('button',{name:E.ITEMS[item].name+' × 1',exact:true}).tap();await page.getByRole('button',{name:'使用道具',exact:true}).tap();
  await page.waitForFunction(()=>window.__game.snapshot().game.turn===1&&!window.__game.snapshot().busy);const after=await snapshot(page);assert.equal(after.kinds[lot],item==='original-40'?3:2);assert.deepEqual(C.replayCommands(map,await page.evaluate(()=>window.__game.replay())),after);
  await page.screenshot({path:'test-results/'+item+'-built.png'});await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();assert.deepEqual(await snapshot(page),after);checks.push(item+': touch build, original art, replay, cold save');await context.close();
 }
 const {g,lot}=fixture(2);g.phase='landed';E.landing(map,g);while(g.phase==='resolving')E.advance(map,g);
 const {context,page}=await open(g);await page.getByText(g.players[0].name+' · 自制导弹 · 选择目标',{exact:true}).waitFor();await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();await page.getByRole('button',{name:g.players[1].name,exact:true}).tap();
 await page.getByText(g.players[1].name+'被自制导弹击中，送入倒霉区域。',{exact:true}).first().waitFor();const after=await snapshot(page);assert.equal(after.players[1].jail,true);assert.equal(after.kinds[lot],2);assert.deepEqual(C.replayCommands(map,await page.evaluate(()=>window.__game.replay())),after);await page.screenshot({path:'test-results/missile-touch-result.png'});checks.push('missile: restore pending selection, touch fire, jail, persistent base, replay');await context.close();
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/special-buildings-ui-report.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});

