const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const E=await import('../app/src/engine.mjs'),{propertyDirection,propertySprite}=await import('../app/src/property-art.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/5.json'));
 const lot=map.cells.findIndex(c=>c.event===1&&c.terrain===13&&E.walkable(map.cells[(c.y-1)*map.width+c.x]));
 assert.ok(lot>=0);const cell=map.cells[lot],at=lot-map.width,errors=[],checks=[];
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  for(const level of [0,1,2,3,4]){
   const game=E.createGame(map,{startDate:'2000-04-03',seed:72,players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
   game.turn=3;game.players[3].at=at;game.players[3].half=null;game.owners[lot]=3;game.levels[lot]=level;game.kinds[lot]=level?1:0;
   const context=await browser.newContext({viewport:{width:915,height:412},hasTouch:true});
   await context.addInitScript(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),game);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);
   await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();
   await page.waitForFunction(()=>{const s=window.__game.snapshot();return s.active&&!s.busy});
   await page.waitForTimeout(150);await page.screenshot({path:`test-results/rc20-future-property-level-${level}.png`});
   const state=await page.evaluate(()=>window.__game.snapshot().game);assert.equal(state.levels[lot],level);
   checks.push({map:5,lot,terrain:cell.terrain,level,owner:3,character:'gian',sprite:propertySprite({owner:3,level,character:'gian',direction:propertyDirection(map,lot)})});
   await context.close();
  }
  {
   const game=E.createGame(map,{startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
   game.turn=3;game.players[3].at=at;game.owners[lot]=3;game.levels[lot]=0;game.kinds[lot]=0;game.phase='prompt';game.pending={kind:'property',lot};
   E.restore(map,JSON.stringify(game));
   const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true});
   await page.addInitScript(g=>{if(!localStorage.getItem('qaSeeded')){localStorage.setItem('qaSeeded','1');localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));}},game);
   await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);
   await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();
   await page.getByRole('button',{name:'升级建筑',exact:true}).tap();await page.waitForFunction(lot=>window.__game.snapshot().game.levels[lot]===1,lot);
   await page.screenshot({path:'test-results/rc20-future-property-touch-upgrade.png'});
   const before=await page.evaluate(()=>window.__game.snapshot().game);
   await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
   const after=await page.evaluate(()=>window.__game.snapshot().game);assert.equal(after.levels[lot],1);assert.equal(after.players[3].cash,before.players[3].cash);
   checks.push({touchUpgrade:true,coldResume:true,lot,level:after.levels[lot]});await page.close();
  }
  for(const event of [10,11]){
   const eventAt=map.cells.findIndex(c=>c.event===event),game=E.createGame(map,{startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
   game.players[0].at=eventAt;
   const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true});
   await page.addInitScript(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),game);
   await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);
   await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
   const point=await page.evaluate(i=>window.__game.cellScreen(i),eventAt);await page.touchscreen.tap(point.x,point.y);
   const text=await page.locator('#inspect').innerText();assert.match(text,event===10?/红底铜锣烧.*50～450/:/黑底铜锣烧.*75～149/);
   await page.screenshot({path:`test-results/rc20-circle-${event}-help.png`});checks.push({event,text});await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('test-results/rc20-property-art-ui.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(checks);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
