const {chromium}=require('../app/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const E=await import('../app/src/engine.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const game=E.createGame(map,{seed:72,startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
 game.phase='prompt';game.pending={kind:'bank',lot:map.cells.findIndex(c=>c.event===6)};
 game.players[0].at=E.adjacent(map,game.pending.lot).find(i=>E.walkable(map.cells[i]));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const checks=[];
 try{
  for(const [width,height,position,cash,bank] of [[915,412,25,500,1500],[640,320,75,1500,500],[360,640,0,0,2000]]){
   const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});
   await ctx.addInitScript(g=>{if(!localStorage.getItem('seeded')){localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));localStorage.setItem('seeded','1');}},game);
   const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5231',{waitUntil:'domcontentloaded'});
   const resume=async()=>{await p.waitForFunction(()=>!!window.__game);await p.locator('#titleGate').tap();await p.getByRole('button',{name:'大富翁',exact:true}).tap();await p.locator('#continueGame').tap();};
   await resume();const slider=p.getByRole('slider',{name:'矿山存取比例'});try{await slider.waitFor();}catch(e){console.log(await p.locator('body').innerText(),errors);throw e;}
   assert.equal(await slider.inputValue(),'50');
   const box=await slider.boundingBox();await slider.tap({position:{x:12+(box.width-24)*position/100,y:box.height/2}});
   assert.equal(await slider.inputValue(),String(position));
   assert.equal(await p.evaluate(()=>window.__game.snapshot().game.players[0].cash),1000,'preview must not mutate money');
   const bounds=await p.locator('#modal').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight}));
   assert.ok(bounds.content<=bounds.height+1,JSON.stringify({width,height,bounds}));
   await p.screenshot({path:'test-results/bank-amount-'+width+'.png'});
   await p.getByRole('button',{name:'确认存取',exact:true}).tap();await p.waitForFunction(()=>!window.__game.snapshot().busy);
   let state=await p.evaluate(()=>window.__game.snapshot().game.players[0]);assert.equal(state.cash,cash);assert.equal(state.bank,bank);
   await p.reload({waitUntil:'domcontentloaded'});await resume();await p.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
   state=await p.evaluate(()=>window.__game.snapshot().game.players[0]);assert.equal(state.cash,cash);assert.equal(state.bank,bank);assert.deepEqual(errors,[]);
   checks.push({width,height,position,cash,bank,persisted:true});await ctx.close();
  }
  fs.writeFileSync('test-results/bank-amount-ui.json',JSON.stringify({checks},null,2));console.log(checks);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
