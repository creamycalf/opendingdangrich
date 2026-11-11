const {chromium}=require('../app/node_modules/playwright');const fs=require('node:fs'),assert=require('node:assert/strict');
const prefix=process.env.QA_REVISION?process.env.QA_REVISION+'-':'';
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const E=await import('../app/src/engine.mjs'),C=await import('../app/src/commands.mjs'),F=await import('./item-fixture.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json')),errors=[],checks=[];
 const rules=g=>{for(const key of ['mapRevision','randomVersion','propertyAiVersion','pcEconomyVersion','itemAiVersion','pcNavigationVersion'])assert.equal(g[key],'pc-v126',key);};
 for(const item of Object.keys(E.ITEMS)){
  const {g,command}=F.itemFixture(map,item),id=E.ITEMS[item].originalId;
  rules(g);
  const context=await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true});await context.addInitScript(g=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));}},g);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(item+': '+e.message));await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  await page.locator('#items').tap();await page.getByRole('button',{name:'查看 '+E.ITEMS[item].name,exact:true}).tap();await page.getByRole('button',{name:'查看用法 · '+E.ITEMS[item].name,exact:true}).tap();await page.getByRole('button',{name:'使用道具',exact:true}).tap();
  if(id===21){for(const at of [command.target.first,command.target.second]){const xy=await page.evaluate(i=>window.__game.cellScreen(i),at);await page.touchscreen.tap(xy.x,xy.y);}}
  else if([6,13,37].includes(id)){const xy=await page.evaluate(i=>window.__game.cellScreen(i),command.target);await page.touchscreen.tap(xy.x,xy.y);}
  else if(id===26){for(const i of [command.target.donor,command.target.recipient])await page.getByRole('button',{name:g.players[i].name,exact:true}).tap();}
  else if(command.target!==undefined)await page.getByRole('button',{name:g.players[command.target].name,exact:true}).tap();
  await page.waitForFunction(()=>window.__game.snapshot().visual?.loaded&&window.__game.snapshot().visual.frame>=3);
  if([0,1,4,12,13,21,26,32,36,38,39,40].includes(id))await page.screenshot({path:`test-results/${prefix}item-animation-${id}.png`});
  if(id===12){
   await page.locator('#pause').tap();await page.waitForFunction(()=>!window.__game.snapshot().busy);const stopped=await page.evaluate(()=>window.__game.snapshot());
   await page.waitForTimeout(150);assert.deepEqual(await page.evaluate(()=>window.__game.snapshot().visual),stopped.visual);
   assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('dingdang.touch.v2'))),stopped.game);
   await page.getByRole('button',{name:'继续游戏',exact:true}).tap();
  }
  await page.waitForFunction(()=>!window.__game.snapshot().visual&&!window.__game.snapshot().busy,{},{timeout:30000});
  const after=await page.evaluate(()=>window.__game.snapshot().game);assert.deepEqual(C.replayCommands(map,await page.evaluate(()=>window.__game.replay())),after);
  rules(after);assert.deepEqual(E.restore(map,JSON.stringify(after)),after);assert.deepEqual(await page.evaluate(()=>window.__game.audio().errors),[]);
  checks.push({item,name:E.ITEMS[item].name,passed:true});fs.writeFileSync(`test-results/${prefix}all-items-ui-report.json`,JSON.stringify({status:'running',checks,errors},null,2));console.log(id,item,'passed');await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`test-results/${prefix}all-items-ui-report.json`,JSON.stringify({status:'passed',map:'maps-v126/4',ruleVersions:['mapRevision','randomVersion','propertyAiVersion','pcEconomyVersion','itemAiVersion','pcNavigationVersion'],checks,errors},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
