const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('../app/node_modules/playwright');
(async()=>{
  const E=await import('../app/src/engine.mjs'), M=await import('../app/src/minigames.mjs');
  const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json')),g=E.createGame(map,{seed:17,startDate:'2000-05-02'});
  g.phase='prompt';g.pending={kind:'minigame',session:M.createMiniGame(3,g.players,n=>E.random(g,n))};
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:740,height:380},hasTouch:true});
    await page.addInitScript(game=>{if(!localStorage.getItem('dingdang.touch.v2'))localStorage.setItem('dingdang.touch.v2',JSON.stringify(game));},g);
    await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5187');
    await page.locator('#titleGate').tap();await page.getByRole('button',{name:/操[作控]设定/}).tap();
    const seat=page.getByRole('combobox',{name:'P1 控制设备'});await seat.selectOption('5');
    await page.screenshot({path:'test-results/pc-controller-settings.png'});
    await page.getByRole('button',{name:'保存',exact:true}).tap();
    await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.getByRole('button',{name:'开始小游戏',exact:true}).tap();
    await page.waitForFunction(()=>window.__game.snapshot().game.pending.session.remaining<448);
    for(const [i,key] of ['a','d','a','d'].entries()){
      await page.keyboard.press(key);await page.waitForFunction(i=>window.__game.snapshot().game.pending.session.players[0].strokes===i+1,i,{timeout:1600});
    }
    await page.waitForFunction(()=>window.__game.snapshot().game.pending.session.players[0].score===1);
    await page.getByRole('button',{name:g.players[0].name+'选左',exact:true}).tap();
    await page.waitForFunction(()=>window.__game.snapshot().game.pending.session.players[0].strokes===5);
    console.log('Title menu saved P1 WASD and the active grow minigame scored from four keyboard strokes plus a fifth touch stroke.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
