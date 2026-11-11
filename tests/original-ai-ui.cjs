const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');

(async()=>{
 const E=await import('../app/src/engine.mjs');
 const C=await import('../app/src/commands.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const revision=process.env.QA_REVISION||'rc13';
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const checks=[],errors=[];
 try{
  for(const item of ['air',null]){
   const game=E.createGame(map,{seed:387276917,startDate:'2000-04-03',players:['nobita','doraemon','shizuka','gian'].map((character,i)=>({character,control:i?'human':'ai'}))});
   game.players[0].inventory=item?[item]:[];
   assert.equal(game.itemAiVersion,'pc-v126');
   const context=await browser.newContext({viewport:{width:640,height:320},hasTouch:true});
   await context.addInitScript(game=>{
    localStorage.setItem('dingdang.touch.v2',JSON.stringify(game));
    localStorage.setItem('dingdang.roll-animation','off');
   },game);
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5268');
   await page.waitForFunction(()=>!!window.__game);
   await page.locator('#titleGate').tap();
   await page.getByRole('button',{name:'大富翁',exact:true}).tap();
   await page.locator('#continueGame').tap();
   if(item){
    await page.waitForFunction(()=>window.__game.snapshot().visual?.loaded&&window.__game.snapshot().visual.frame>=3,{},{timeout:60000});
    assert.equal((await page.evaluate(()=>window.__game.snapshot().visual)).item,'air');
    await page.screenshot({path:`test-results/${revision}-original-ai-animation.png`});
   }
   await page.waitForFunction(()=>{
    const s=window.__game.snapshot();
    return s.active&&!s.busy&&!s.visual&&s.game.turn!==0&&s.game.players[s.game.turn].control==='human';
   },{},{timeout:90000});
   const {record,state,audio}=await page.evaluate(()=>({record:window.__game.replay(),state:window.__game.snapshot().game,audio:window.__game.audio()}));
   const ai=record.commands.find(command=>command.type==='aiAction');
   assert(ai);assert.equal(ai.animated,false);
   assert.deepEqual(C.replayCommands(map,record),state);
   assert.deepEqual(E.restore(map,JSON.stringify(state)),state);
   assert.deepEqual(audio.errors,[]);
   assert.notDeepEqual(state.players[0].itemAi.weights,game.players[0].itemAi.weights);
   if(item){
    assert(!state.players[0].inventory.includes('air'));
    assert(state.players[1].effects.some(effect=>effect.id==='air'));
   }
   checks.push({kind:item?'original-ai-item-presentation-and-replay':'original-ai-instant-roll-and-replay',passed:true});
   await context.close();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`test-results/${revision}-original-ai-ui.json`,JSON.stringify({status:'passed',checks,errors},null,2));
  console.log(checks.length+' original AI UI checks passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
