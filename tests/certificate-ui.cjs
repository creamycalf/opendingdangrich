const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const revision=process.env.QA_REVISION||'rc10';
(async()=>{
 const {createGame}=await import('../app/src/engine.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 const saved=createGame(map,{seed:123,startDate:'2000-04-03'});
 saved.phase='end';saved.round=2;saved.players[0].cash=20000;
 saved.players.slice(1).forEach(p=>p.eliminated=true);
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const report=[];
 try{for(const [width,height]of[[640,320],[360,640]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(g=>{if(!localStorage.getItem('dingdang.touch.v2'))localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));},saved);
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5250');await page.waitForFunction(()=>!!window.__game,{},{timeout:60000});
  await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();
  await page.getByRole('button',{name:'查看证书',exact:true}).waitFor({timeout:60000});
  assert.equal(await page.evaluate(()=>window.__game.snapshot().game.phase),'gameover');
  await page.getByRole('button',{name:'查看证书',exact:true}).tap();await page.locator('.certificateCanvas').waitFor();
  await page.getByLabel('证书姓名').fill('测试玩家');await page.getByRole('button',{name:'签名',exact:true}).tap();
  await page.getByRole('button',{name:'已签名',exact:true}).waitFor();
  const layout=await page.locator('#modal').evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight}));assert(layout.scroll<=layout.height+1,JSON.stringify(layout));
  await page.screenshot({path:`test-results/${revision}-certificate-${width}.png`});
  await page.getByRole('button',{name:'文字成绩',exact:true}).tap();assert.match(await page.locator('#modalContent').innerText(),/Rank S/);
  await page.getByRole('button',{name:'查看证书',exact:true}).tap();assert.equal(await page.getByLabel('证书姓名').inputValue(),'测试玩家');
  await page.getByRole('button',{name:'再玩一局',exact:true}).tap();await page.getByRole('button',{name:'选择黄耳叮当',exact:true}).tap();
  assert.equal(await page.locator('#character0').inputValue(),'yellow');
  await page.reload();await page.waitForFunction(()=>!!window.__game,{},{timeout:60000});await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#newGame').tap();await page.getByRole('button',{name:'设置新游戏',exact:true}).tap();
  await page.getByRole('button',{name:'选择黄耳叮当',exact:true}).tap();assert.equal(await page.locator('#character0').inputValue(),'yellow');
  assert.deepEqual(errors,[]);report.push({width,height,layout,settled:true,signatureSaved:true,yellowAfterRestart:true,pageErrors:errors});await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(`test-results/${revision}-certificate-ui.json`,JSON.stringify({entry:'Restored end-turn save with three eliminated AI, then normal engine nextTurn settlement',checks:report},null,2));console.log('Certificate, signature and persistent yellow unlock passed in two phone layouts.');
})().catch(e=>{console.error(e);process.exitCode=1});
