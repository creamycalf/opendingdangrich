const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
 const out='test-results/'+(process.env.QA_REVISION||'rc22')+'-ending-production';fs.mkdirSync(out,{recursive:true});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true});const cdp=await page.context().newCDPSession(page),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);
 const button=name=>page.getByRole('button',{name,exact:true});
 async function tap(loc){await loc.waitFor({state:'visible'});await loc.scrollIntoViewIfNeeded();await page.waitForFunction(el=>!el.disabled,await loc.elementHandle());const r=await loc.boundingBox();assert.ok(r&&r.y>=0&&r.y+r.height<=page.viewportSize().height+2,'touch target visible');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 const audio=()=>page.evaluate(()=>window.__game.audio());
 const game=()=>page.evaluate(()=>window.__game.snapshot().game);
 async function track(id){try{await page.waitForFunction(id=>window.__game.audio().track===id&&window.__game.audio().playing,id);}catch(e){console.log('TRACK FAILURE',id,await page.evaluate(()=>({audio:window.__game.audio(),modal:document.getElementById('modalContent').innerText,game:window.__game.snapshot().game?.phase})));throw e;}}
 async function enter(g){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__game);if(g)await page.evaluate(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),g);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__game);await tap(page.locator('#titleGate'));await tap(button('大富翁'));await tap(page.locator('#continueGame'));}
 const ledger=g=>g.players.map(p=>({cash:p.cash,bank:p.bank,walkPoints:p.walkPoints,monthlyClaimed:p.monthlyClaimed}));
 const E=await import('../app/src/engine.mjs'),{executeCommand}=await import('../app/src/commands.mjs');
 const town=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
 if(process.env.QA_LAYOUT_ONLY==='1'){
  let g=E.createGame(town,{startDate:'2000-04-30'});g.players.forEach(p=>p.control='human');g.turn=3;g.phase='end';g=executeCommand(town,g,{type:'nextTurn'}).state;
  for(const [width,height]of [[640,320],[915,412],[320,640]]){
   await page.setViewportSize({width,height});await enter(g);await page.waitForSelector('.monthlyPresentation[data-stage="intro-ready"]',{state:'attached'});
   const layout=await page.evaluate(()=>{const d=document.getElementById('modal'),s=document.querySelector('.originalEnding');return {scroll:d.scrollHeight-d.clientHeight,canvas:(()=>{const r=s.querySelector('canvas').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})(),buttons:[...d.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})};});
   assert.ok(layout.scroll<=1);assert.ok(layout.canvas.y>=0&&layout.canvas.y+layout.canvas.h<=height);assert.ok(Math.abs(layout.canvas.w/layout.canvas.h-4/3)<.01);
   for(const b of layout.buttons)assert.ok(b.h>=44&&b.x>=0&&b.y>=0&&b.x+b.w<=width+1&&b.y+b.h<=height+1,JSON.stringify({width,height,layout}));assert.ok(Math.abs(layout.buttons[0].y-layout.buttons[1].y)<1);
   await page.screenshot({path:out+`/layout-${width}x${height}.png`});await tap(button('查看月结排行'));await page.waitForSelector('.monthlyPresentation[data-stage="result-ready"]',{state:'attached'});await tap(button('确认月结，继续游戏'));checks.push(`${width}x${height} original 4:3 scene and both44px footer buttons visible without scroll; real touch completes monthly`);
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/layout-report.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(checks);await browser.close();return;
 }
 if(process.env.QA_RACE_ONLY==='1'){
  let g=E.createGame(town,{startDate:'2000-04-30'});g.players.forEach(p=>p.control='human');g.turn=3;g.phase='end';g=executeCommand(town,g,{type:'nextTurn'}).state;
  let requests=0;await page.route('**/monthly-scenes/catalog.json',async route=>{requests++;await new Promise(r=>setTimeout(r,1800));await route.continue().catch(()=>{});});
  await enter(g);await tap(button('保存并返回主菜单'));await page.waitForTimeout(2300);assert.ok(requests);assert.equal(await page.locator('.originalEnding').count(),0);await track(2);assert.deepEqual(ledger(JSON.parse(await page.evaluate(()=>localStorage.getItem('dingdang.touch.v2')))),ledger(g));
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/race-report.json',JSON.stringify({passed:true,checks:['delayed monthly catalog then touch save/title: aborted load never appends into title; saved payout unchanged'],errors},null,2));console.log('late resource/exit race passed');await browser.close();return;
 }
 for(const early of [false,true]){
  let g=E.createGame(town,{startDate:'2000-04-30'});g.players.forEach(p=>p.control='human');
  if(early){g.players[0].inventory=['original-5'];g=executeCommand(town,g,{type:'useItem',item:'original-5'}).state;}else{g.turn=3;g.phase='end';g=executeCommand(town,g,{type:'nextTurn'}).state;}
  await enter(g);await track(9);await page.waitForSelector('.monthlyPresentation[data-stage="intro-ready"]',{state:'attached'});assert.deepEqual(ledger(await game()),ledger(g));
  await page.screenshot({path:out+`/monthly-${early?'early':'normal'}-intro.png`});await tap(button('保存并返回主菜单'));await enter();await track(9);assert.deepEqual(ledger(await game()),ledger(g));
  if(!early){await tap(button('查看月结排行'));await track(10);await page.waitForSelector('.monthlyPresentation[data-stage="result-ready"]',{state:'attached'});await page.screenshot({path:out+'/monthly-result.png'});await tap(button('确认月结，继续游戏'));}else await tap(button('领取完毕，继续游戏'));
  await page.waitForFunction(()=>window.__game.snapshot().game.phase==='ready');assert.deepEqual(ledger(await game()),ledger(g));checks.push(early?'early monthly track9 only, save/reload and dismiss never reapply payout':'regular monthly9→10 original two pages, save/reload and dismiss never reapply payout');
 }
 const original=JSON.parse(fs.readFileSync('test-results/rc18-v126-soak-last.json'));
 const records=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k==='dingdang.finished-scores'||k==='dingdang.certificate-awards.v1')));
 async function victoryPages(){await track(4);await tap(button('查看胜利成绩'));await tap(button('查看资产与天数'));await tap(button('继续领取证书'));}
 for(const kind of ['ai','human','yellow']){
  const g=structuredClone(original),winner=g.winners[0];g.players.forEach(p=>p.control='ai');if(kind!=='ai')g.players[winner].control='human';else g.players.find((_,i)=>i!==winner).control='human';
  if(kind==='yellow'){g.players[winner].character='yellow';g.players[winner].name='黄耳叮当';}
  if(kind==='human'){const former=g.players.findIndex(p=>p.character==='doraemon');g.players[former].character=g.players[winner].character;g.players[former].name=g.players[winner].name;g.players[winner].character='doraemon';g.players[winner].name='哆啦A梦';g.players[winner].cash=200000;}
  E.restore(JSON.parse(fs.readFileSync('app/public/assets/maps-v126/'+g.map+'.json')),JSON.stringify(g));await enter(g);await track(kind==='ai'?6:4);await page.waitForSelector('.originalEnding',{state:'attached'});const first=await records();assert.deepEqual(ledger(await game()),ledger(g));
  await tap(button('保存并返回主菜单'));await enter();await page.waitForSelector('.originalEnding',{state:'attached'});assert.deepEqual(await records(),first);assert.deepEqual(ledger(await game()),ledger(g));
  if(kind==='ai'){await page.screenshot({path:out+'/ai-letters.png'});await tap(button('返回主菜单'));await track(2);checks.push('AI loss original letters + track6 → title2; reopen leaves ranking and economy unchanged');continue;}
  await victoryPages();
  if(kind==='human'){
   await page.locator('.certificateCanvas').waitFor();await page.screenshot({path:out+'/certificate.png'});await tap(button('继续原版片尾'));await page.waitForSelector('.victoryPresentation[data-stage="afterword-playing"]',{state:'attached'});await track(4);await page.waitForSelector('.victoryPresentation[data-stage="afterword-ready"]',{state:'attached',timeout:65000});await page.screenshot({path:out+'/afterword-complete.png'});await tap(button('返回主菜单'));await track(2);
   checks.push('human original opening/two strips→certificate→full original 1520-frame afterword→title; unlock/ranking idempotent');
  }else{await page.waitForSelector('.victoryPresentation[data-stage="afterword-playing"]',{state:'attached'});assert.equal(await page.locator('.certificateCanvas').count(),0);await tap(button('保存并返回主菜单'));await page.waitForTimeout(100);assert.equal(await page.locator('.originalEnding').count(),0);checks.push('yellow winner skips certificate directly to afterword; exit disposes scene');}
  assert.deepEqual(await records(),first);
 }
 assert.deepEqual(errors,[]);assert.deepEqual((await audio()).errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({passed:true,checks,errors,input:'production dist, real CDP touchStart/touchEnd, isolated browser localStorage, 915×412'},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
