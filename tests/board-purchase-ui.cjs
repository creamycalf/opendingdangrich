const { chromium } = require('../app/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const engine = await import('../app/src/engine.mjs');
 const map = JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const game = engine.createGame(map, {seed:42,startDate:'2000-11-04',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
 const start=map.cells[game.players[0].at];
 const lots=map.cells.map((cell,i)=>({cell,i})).filter(({cell,i})=>cell.event===1&&engine.adjacent(map,i).some(n=>engine.walkable(map.cells[n]))).sort((a,b)=>Math.hypot(a.cell.x-start.x,a.cell.y-start.y)-Math.hypot(b.cell.x-start.x,b.cell.y-start.y));
 const lot=lots[0].i;
 game.players[0].at=engine.adjacent(map,lot).find(n=>engine.walkable(map.cells[n]));
 game.phase='prompt';game.pending={kind:'buy',lot};
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 for(const [w,h,action] of [[640,480,'购买地块'],[360,640,'这次先路过']]){
  const page=await browser.newPage({viewport:{width:w,height:h},isMobile:true,hasTouch:true});
  await page.addInitScript(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),game);
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:5178');await page.locator('#titleGate').tap();
  await page.getByRole('button',{name:'大富翁',exact:true}).tap();
  await page.locator('#continueGame').tap();
  const btn=page.getByRole('button',{name:action,exact:true});await btn.waitFor();
  const box=await btn.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=w&&box.y+box.height<=h);
  await page.screenshot({path:'test-results/property-offer-'+w+'.png'});await btn.tap();
  await page.waitForFunction(()=>window.__game.snapshot().game.turn===1);
  const state=await page.evaluate(()=>window.__game.snapshot().game);
  assert.equal(state.owners[lot],action==='购买地块'?0:undefined);
  assert.equal(state.players[0].cash,action==='购买地块'?1000-engine.landPrice(map.cells[lot],game):1000);
  await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

