const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const revision=process.env.QA_REVISION||'rc12';
(async()=>{
 const E=await import('../app/src/engine.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const cashRows=JSON.parse(fs.readFileSync('tests/fixtures/pc-v126-hud-steps.json')).cashRows;
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const checks=[],errors=[];
 const fresh=()=>{const g=E.createGame(map,{startDate:'2000-04-03',seed:123});g.players.forEach(p=>p.control='human');return g;};
 async function resume(game){
  E.restore(map,JSON.stringify(game));
  const context=await browser.newContext({viewport:{width:640,height:320},hasTouch:true});
  await context.addInitScript(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),game);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5258');await page.waitForFunction(()=>!!window.__game,{},{timeout:60000});
  await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();
  await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy,{},{timeout:60000});
  return {page,context};
 }
 async function hud(page,amount,expected){
  const node=page.locator('#cashDigits');assert.equal(await node.getAttribute('aria-label'),'豆沙包 '+Math.trunc(amount));
  const sprites=await node.locator('img').evaluateAll(images=>images.map(im=>Number(im.getAttribute('src').match(/(\d+)\.png$/)[1])));
  assert.deepEqual(sprites,expected);assert.equal(sprites.length,6);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('#cashDigits img')).every(im=>im.complete&&im.naturalWidth>0));
 }
 try{
  for(const row of cashRows){
   const g=fresh();g.players[0].cash=row.amount;g.players[0].cashDebtDays=row.amount<0?7:0;
   const {page,context}=await resume(g),stored=await page.evaluate(()=>window.__game.snapshot().game.players[0].cash);
   assert.equal(stored,Math.min(999999,Math.fround(row.amount)));await hud(page,stored,row.digits.map(n=>row.base+n%10));
   checks.push({kind:'original-cash-fixture',amount:row.amount,stored,passed:true});await context.close();
  }
  {
   const g=fresh();g.players[0].cash=-123;g.players[0].cashDebtDays=7;
   const {page,context}=await resume(g);await hud(page,-123,[539,539,539,540,541,542]);
   assert.match(await page.locator('#turnBanner').innerText(),/负现金第 7 天/);
   await page.screenshot({path:`test-results/${revision}-negative-cash.png`});checks.push({kind:'negative-123-hud',passed:true});await context.close();
  }
  for(const withdrawOnly of [false,true]){
   const g=fresh();const lot=map.cells.findIndex((c,i)=>c.event===6&&E.adjacent(map,i).some(n=>E.walkable(map.cells[n])));
   assert(lot>=0);g.players[0].at=E.adjacent(map,lot).find(n=>E.walkable(map.cells[n]));g.players[0].cash=-123;g.players[0].bank=1000;g.players[0].cashDebtDays=7;
   g.phase='prompt';g.pending={kind:'bank',lot,withdrawOnly};const {page,context}=await resume(g);
   const slider=page.getByLabel('矿山存取比例');assert.equal(await slider.getAttribute('min'),withdrawOnly?'50':'0');assert.equal(await slider.getAttribute('max'),'100');await slider.fill('100');await slider.dispatchEvent('input');
   assert.match(await page.locator('.bankTransfer').innerText(),/手持 877 · 矿山 0/);
   await page.getByRole('button',{name:'确认存取',exact:true}).tap();
   await page.waitForFunction(()=>window.__game.snapshot().game.players[0].cash===877&&!window.__game.snapshot().busy);
   const after=await page.evaluate(()=>window.__game.snapshot().game);assert.equal(after.players[0].bank,0);E.restore(map,JSON.stringify(after));
   const replay=await page.evaluate(()=>window.__game.replay());assert(replay.commands.some(c=>c.type==='answer'&&c.action==='bankPosition'&&c.value===100));
   assert.notEqual(after.pending?.kind,'bank');
   await page.screenshot({path:`test-results/${revision}-negative-cash-bank-${withdrawOnly?'passing':'stopped'}-recovered.png`});checks.push({kind:'withdraw-negative-to-positive',withdrawOnly,cash:877,bank:0,passed:true});await context.close();
  }
  {
   const g=fresh();g.round=2;g.phase='end';g.players[0].cash=-123;g.players[0].bank=0;g.players.slice(1).forEach(p=>p.eliminated=true);
   const {page,context}=await resume(g);assert.match(await page.locator('#modalContent').innerText(),/Rank E/);assert.match(await page.locator('#modalContent').innerText(),/总资产 -123/);
   await page.getByRole('button',{name:'查看证书',exact:true}).tap();assert.match(await page.locator('.certificateCanvas').getAttribute('aria-label'),/Rank E/);
   await page.screenshot({path:`test-results/${revision}-negative-assets-certificate.png`});checks.push({kind:'negative-assets-certificate',grade:'E',passed:true});await context.close();
  }
  {
   const g=fresh();g.round=15;g.turn=3;g.phase='end';g.players.forEach(p=>{p.cash=-1;p.cashDebtDays=14;});
   const {page,context}=await resume(g);const ended=await page.evaluate(()=>window.__game.snapshot().game);
   assert.equal(ended.phase,'gameover');assert(ended.players.every(p=>p.eliminated));assert.deepEqual(ended.winners,[]);
   assert.match(await page.locator('#modalContent h2').innerText(),/本局无人获胜/);assert.equal(await page.getByRole('button',{name:'查看证书',exact:true}).count(),0);
   await page.screenshot({path:`test-results/${revision}-no-winner.png`});await page.getByRole('button',{name:'再玩一局',exact:true}).tap();await page.getByRole('button',{name:'确定角色',exact:true}).waitFor();
   checks.push({kind:'all-bankrupt-next-game',passed:true});await context.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 fs.writeFileSync(`test-results/${revision}-negative-cash-ui.json`,JSON.stringify({checks,errors},null,2));console.log(checks.length,'negative cash / bank / settlement checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
