const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const revision=process.env.QA_REVISION||'rc9';
(async()=>{
 const E=await import('../app/src/engine.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const errors=[],checks=[];
 try {
  for(const character of ['doraemon','yellow']){
   const game=E.createGame(map,{startDate:'2000-04-03',seed:72,players:[character,'nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
   const context=await browser.newContext({viewport:{width:915,height:412},hasTouch:true,isMobile:true});
   await context.addInitScript(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),game);
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5231',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__game);
   await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();
   try{await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy,null,{timeout:60000});}
   catch(error){console.error(await page.locator('body').innerText(),errors);throw error;}
   await page.waitForTimeout(150);
   const colors=await page.locator('#board').evaluate(canvas=>{
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,set=new Set();
    for(let n=0;n<data.length;n+=64)set.add(data[n]+','+data[n+1]+','+data[n+2]);
    return set.size;
   });
   assert.ok(colors>100,'Board canvas must contain rendered terrain and actors');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:'test-results/board-'+character+'-'+revision+'.png'});
   await page.locator('#roll').tap();
   for(let i=0;i<200;i++){
    const state=await page.evaluate(()=>window.__game.snapshot());
    if(state.game.players[0].at!==game.players[0].at)break;
    const route=page.locator('#routes button').first();
    if(!state.busy&&await route.isVisible())await route.tap();
    await page.waitForTimeout(100);
   }
   assert.notEqual(await page.evaluate(()=>window.__game.snapshot().game.players[0].at),game.players[0].at);
   await page.waitForTimeout(300);
   assert.deepEqual(errors,[]);
   checks.push({character,colors,moved:true});await context.close();
  }
  const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true,isMobile:true});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5231',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__game);
  await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#newGame').tap();
  await page.getByRole('button',{name:'隐藏角色',exact:true}).tap();
  await page.getByRole('textbox',{name:'输入秘籍'}).fill('GO2HIDDENCHAR');
  await page.getByRole('button',{name:'确定',exact:true}).tap();
  await page.getByRole('button',{name:'选择黄耳叮当',exact:true}).tap();
  for(const name of ['确定角色','确定地图','开始游戏'])await page.getByRole('button',{name,exact:true}).tap();
  await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  const yellow=await page.evaluate(()=>window.__game.snapshot().game.players[0]);
  assert.equal(yellow.character,'yellow');assert.equal(yellow.inventory.length,42);assert.equal(new Set(yellow.inventory).size,42);
  assert.equal(yellow.cash,1000);assert.equal(yellow.bank,1000);assert.deepEqual(errors,[]);
  checks.push({character:'yellow',newGameSecret:true,inventory:yellow.inventory.length});
  fs.writeFileSync('test-results/board-render-'+revision+'.json',JSON.stringify({checks,errors},null,2));
  console.log(checks);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
