const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');

(async()=>{
 const E=await import('../app/src/engine.mjs');
 const C=await import('../app/src/commands.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const revision=process.env.QA_REVISION||'rc14';
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const checks=[],errors=[];
 function fixture(legacy){
  const game=E.createGame(map,{seed:387276917,startDate:'2000-04-03'});
  game.players.forEach(player=>player.control='human');
  if(legacy){delete game.pcNavigationVersion;delete game.pcNavigationFirst;}
  game.phase='moving';game.remaining=2;game.dice=2;game.dicePending=false;
  const player=game.players[0];player.straightDistance=1;
  for(const cell of map.cells){
   if(!E.walkable(cell)||cell.event!==0)continue;
   player.at=cell.y*map.width+cell.x;
   for(let direction=0;direction<4;direction++){
    player.direction=direction;
    if(E.choices(map,game).length>1){E.restore(map,JSON.stringify(game));return game;}
   }
  }
  throw Error('No real junction fixture');
 }
 try{
  for(const legacy of [false,true]){
   const game=fixture(legacy),start=game.players[0].at;
   const context=await browser.newContext({viewport:{width:640,height:320},hasTouch:true});
   await context.addInitScript(game=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(game)),game);
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5268');
   await page.waitForFunction(()=>!!window.__game);
   await page.evaluate(()=>{
    window.routeButtonsSeen=false;
    new MutationObserver(()=>{if(document.querySelector('#routes button'))window.routeButtonsSeen=true;}).observe(document.querySelector('#routes'),{childList:true});
   });
   await page.locator('#titleGate').tap();
   await page.getByRole('button',{name:'大富翁',exact:true}).tap();
   await page.locator('#continueGame').tap();
   if(legacy){
    await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
    assert.equal((await page.evaluate(()=>window.__game.snapshot().game)).players[0].at,start);
    assert(await page.locator('#routes button').count()>1);
    await page.locator('#routes button').first().tap();
   }
   await page.waitForFunction(start=>{const s=window.__game.snapshot();return s.active&&s.game?.players[0].at!==start;},start,{timeout:60000});
   await page.waitForFunction(()=>!window.__game.snapshot().busy,{},{timeout:60000});
   const result=await page.evaluate(()=>({state:window.__game.snapshot().game,record:window.__game.replay(),routesSeen:window.routeButtonsSeen}));
   assert.equal(result.routesSeen,legacy);
   assert(result.record.commands.some(command=>command.type===(legacy?'step':'aiStep')));
   if(!legacy){
    assert.equal(result.state.pcNavigationVersion,'pc-v126');
    assert(!result.record.commands.some(command=>command.type==='step'));
    assert.equal(await page.locator('#routes button').count(),0);
   }
   assert.deepEqual(C.replayCommands(map,result.record),result.state);
   assert.deepEqual(E.restore(map,JSON.stringify(result.state)),result.state);
   await page.screenshot({path:`test-results/${revision}-navigation-${legacy?'legacy':'original'}.png`});
   checks.push({kind:legacy?'legacy-manual-junction':'original-human-automatic-junction',passed:true});
   await context.close();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`test-results/${revision}-navigation-ui.json`,JSON.stringify({status:'passed',checks,errors},null,2));
  console.log(checks.length+' navigation UI checks passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
