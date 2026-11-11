const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
let browser;
(async()=>{
 const E=await import('../app/src/engine.mjs');
 const errors=[],missing=[],checks=[],out='test-results/rc15-touch-core';fs.mkdirSync(out,{recursive:true});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const viewport of [{width:915,height:412},{width:360,height:640}]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))missing.push(r.url());});
  const snapshot=()=>page.evaluate(()=>window.__game.snapshot());
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5183');await page.waitForFunction(()=>!!window.__game);
  await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();
  assert(await page.locator('#continueGame').isDisabled());await page.locator('#newGame').tap();
  await page.getByRole('button',{name:'选择小夫',exact:true}).tap();assert.equal(await page.locator('#character0').inputValue(),'suneo');
  await page.getByRole('button',{name:'选择大雄',exact:true}).tap();assert.equal(await page.locator('#character0').inputValue(),'nobita');
  assert.equal(await page.locator('#character1').inputValue(),'suneo');
  for(let i=2;i<=4;i++)await page.getByRole('button',{name:`切换玩家 ${i} 真人或电脑`,exact:true}).tap();
  await page.screenshot({path:`${out}/selection-${viewport.width}.png`});
  await page.getByRole('button',{name:'确定角色',exact:true}).tap();await page.getByRole('button',{name:'确定地图',exact:true}).tap();
  await page.getByRole('button',{name:'开始游戏',exact:true}).tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  const start=await snapshot(),map=JSON.parse(fs.readFileSync(`app/public/assets/maps-v126/${start.game.map}.json`));
  assert.equal(start.game.players[0].character,'nobita');assert(start.game.players.every(p=>p.control==='human'));
  await page.locator('#roll').tap();assert(await page.locator('#diceDisplay').isVisible());assert(await page.locator('#roll').isDisabled());
  const rolled=await snapshot();assert.equal(rolled.game.players[0].at,start.game.players[0].at);
  const steps=[];
  for(let n=0;n<400;n++){
   const s=await snapshot(),at=s.game.players[0].at;
   assert(E.walkable(map.cells[at]),'player must remain on a walkable road');if(steps.at(-1)!==at)steps.push(at);
   if(s.game.turn===1&&!s.busy)break;
   if(await page.locator('#routes button').count())await page.locator('#routes button').first().tap();
   const label={shop:'离开商店',bank:'离开矿山',destination:'这次先路过',buy:'这次先路过',upgrade:'这次先路过',property:'这次先路过',notice:'继续',monthly:'确认月结，继续游戏',hermit:'中间的宝箱'}[s.game.pending?.kind];
   if(label&&await page.getByRole('button',{name:label,exact:true}).isVisible())await page.getByRole('button',{name:label,exact:true}).tap();
   await page.waitForTimeout(100);
  }
  const after=await snapshot();assert.equal(after.game.turn,1,'first turn must complete');assert(steps.length>1,'dice must cause walking');
  await page.screenshot({path:`${out}/board-${viewport.width}.png`});
  await page.locator('#pause').tap();await page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();const saved=(await snapshot()).game;
  await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();
  await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);assert.deepEqual((await snapshot()).game,saved);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  checks.push({viewport,steps,result:'touch character swapping, human/AI setup, map/term confirmation, dice before walking, road-only movement, turn completion, exact save reload'});
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync(`${out}/result.json`,JSON.stringify({checks,errors,missing},null,2));console.log(JSON.stringify({checks,errors,missing},null,2));await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
