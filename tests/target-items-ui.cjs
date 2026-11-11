const {chromium}=require('../app/node_modules/playwright');const fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
 const E=await import('../app/src/engine.mjs'),F=await import('../app/src/effects.mjs'),C=await import('../app/src/commands.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json')),checks=[],errors=[];
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 async function open(g){const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(g=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));}},g);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();return {context,page};}
 const snapshot=page=>page.evaluate(()=>window.__game.snapshot().game);
 const fixture=item=>{const g=E.createGame(map,{startDate:'2000-05-02'});g.players.forEach(p=>p.control='human');g.players[0].inventory=[item];return g;};
 const inventory=async(page,item)=>{await page.locator('#items').tap();await page.getByRole('button',{name:E.ITEMS[item].name+' × 1',exact:true}).tap();await page.getByRole('button',{name:'使用道具',exact:true}).tap();};
 for(const item of ['original-7','original-17','original-26','original-35']){
  const g=fixture(item);if(item==='original-26')F.applyEffect(g.players[1],'original-4',0,false);
  const {context,page}=await open(g);await inventory(page,item);
  if(item==='original-26'){await page.getByRole('button',{name:g.players[1].name,exact:true}).tap();await page.getByRole('button',{name:'返回选择来源',exact:true}).tap();await page.getByRole('button',{name:'取消',exact:true}).tap();await page.getByRole('button',{name:'返回游戏',exact:true}).tap();assert.deepEqual(await snapshot(page),g);await inventory(page,item);await page.getByRole('button',{name:g.players[1].name,exact:true}).tap();}
  else{await page.getByRole('button',{name:'取消',exact:true}).tap();await page.getByRole('button',{name:'返回游戏',exact:true}).tap();assert.deepEqual(await snapshot(page),g);await inventory(page,item);}
  await page.getByRole('button',{name:g.players[2].name,exact:true}).tap();await page.waitForFunction(()=>window.__game.snapshot().game.turn===1&&!window.__game.snapshot().busy);
  const after=await snapshot(page);assert.deepEqual(after.players[0].inventory,[]);
  if(item==='original-26'){assert.equal(after.players[1].itemSleeping,false);assert.equal(after.players[2].itemSleeping,true);}else assert.equal(after.players[['original-7','original-17'].includes(item)?0:2].effects.some(e=>e.id===item),true);
  assert.deepEqual(C.replayCommands(map,await page.evaluate(()=>window.__game.replay())),after);
  await page.screenshot({path:'test-results/target-'+item+'.png'});await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();assert.deepEqual(await snapshot(page),after);
  checks.push(item+': touch targets, cancellation, replay and cold save');await context.close();
 }
 const g=fixture('original-21'),lots=map.cells.flatMap((c,i)=>c.event===1?[i]:[]);const center=map.cells[g.players[0].at];lots.sort((a,b)=>Math.abs(map.cells[a].x-center.x)+Math.abs(map.cells[a].y-center.y)-Math.abs(map.cells[b].x-center.x)-Math.abs(map.cells[b].y-center.y));
 for(const [j,lot]of lots.slice(0,2).entries()){g.owners[lot]=j+1;g.levels[lot]=j+1;g.kinds[lot]=1;}
 const {context,page}=await open(g);await inventory(page,'original-21');
 const first=await page.evaluate(i=>window.__game.cellScreen(i),lots[0]);await page.touchscreen.tap(first.x,first.y);assert.deepEqual(await snapshot(page),g);
 await page.getByRole('button',{name:'取消选位置',exact:true}).tap();assert.deepEqual(await snapshot(page),g);await inventory(page,'original-21');await page.touchscreen.tap(first.x,first.y);
 const second=await page.evaluate(i=>window.__game.cellScreen(i),lots[1]);await page.touchscreen.tap(second.x,second.y);await page.waitForFunction(()=>window.__game.snapshot().game.turn===1&&!window.__game.snapshot().busy);
 const after=await snapshot(page);assert.equal(after.owners[lots[0]],2);assert.equal(after.owners[lots[1]],1);assert.deepEqual(C.replayCommands(map,await page.evaluate(()=>window.__game.replay())),after);await page.screenshot({path:'test-results/building-swap-touch.png'});
 checks.push('building relocation: two map taps, cancel after first tap, ownership swap and replay');await context.close();
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/target-items-ui-report.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
