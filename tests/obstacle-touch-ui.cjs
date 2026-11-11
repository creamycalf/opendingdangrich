const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const bundle=await require('../app/node_modules/esbuild').build({entryPoints:['app/src/minigame-view.ts'],bundle:true,format:'esm',write:false,outfile:'mini.js'});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://mini.test/**',route=>{
   const url=new URL(route.request().url()),rel=decodeURIComponent(url.pathname).slice(1);
   if(!rel)return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/mini.css"><dialog id="modal" open class="miniModal"><div id="modalContent"></div></dialog>'});
   if(rel==='view.js')return route.fulfill({contentType:'text/javascript',body:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
   if(rel==='mini.css')return route.fulfill({contentType:'text/css',body:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});
   const file=rel==='style.css'?'app/src/style.css':rel.startsWith('src/')?'app/'+rel:'app/public/'+rel;
   if(!fs.existsSync(file))return route.fulfill({status:404,body:rel});
   return route.fulfill({contentType:rel.endsWith('.mjs')?'text/javascript':rel.endsWith('.json')?'application/json':rel.endsWith('.css')?'text/css':undefined,body:fs.readFileSync(file)});
  });
  await page.goto('http://mini.test');
  await page.evaluate(async()=>{
   const M=await import('/src/minigames.mjs'),V=await import('/view.js');
   const players=['哆啦A梦','大雄','静香','胖虎'].map((name,i)=>({name,control:i===3?'human':'ai',eliminated:false}));
   let seed=123;const draw=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
   const session=M.createMiniGame(4,players,draw);session.stage='playing';
   // Reproduce the user's screenshot: 8s remaining, P4 score 13, AI ~30,
   // original shared camera leaves P4 below the visible 336-pixel stage.
   for(let t=0;t<660;t++)M.tickMiniGame(session,players,[0,0,0,t%12===0?4:0],draw);
   const game={players,pending:{session}};window.probe={game,history:[],errors:[],finished:false};
   window.probe.dispose=await V.mountMiniGame(document.querySelector('#modalContent'),{read:()=>game,valid:()=>true,autostart:false,tick:inputs=>{M.tickMiniGame(session,players,inputs,draw);window.probe.history.push({inputs,p4:structuredClone(session.players[3])});},save:async()=>{},exit:()=>{},finish:()=>window.probe.finished=true,error:e=>window.probe.errors.push(String(e))});
  });
  const before=await page.evaluate(()=>structuredClone(probe.game.pending.session.players[3]));
  assert.equal(before.score,13);assert.ok(before.y>336);
  await page.locator('#miniResume').tap();
  for(let i=0;i<12;i++){await page.getByRole('button',{name:'胖虎选左',exact:true}).tap();await page.waitForTimeout(90);}
  await page.locator('#miniPause').tap();
  const result=await page.evaluate(()=>({p4:probe.game.pending.session.players[3],camera:probe.game.pending.session.camera,inputCount:probe.history.filter(h=>h.inputs[3]===4).length,errors:probe.errors}));
  console.log(JSON.stringify(result));assert.equal(result.p4.strokes-before.strokes,12);assert.ok(result.p4.world<before.world);assert.deepEqual(result.errors,[]);
  assert.match(await page.locator('.miniRaceFeedback').innerText(),/加速 67 次/);
  await page.locator('#miniResume').tap();
  const defense=page.getByRole('button',{name:'胖虎选右',exact:true}),box=await defense.boundingBox();
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await page.waitForFunction(()=>probe.game.pending.session.players[3].mode===8);
  await page.waitForTimeout(150);assert.match(await page.locator('.miniRaceFeedback').innerText(),/防守中/);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>probe.game.pending.session.players[3].mode!==8);
  await page.locator('#miniPause').tap();
  const paused=await page.evaluate(()=>probe.history.length);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>probe.history.length),paused);
  assert.equal(await defense.isDisabled(),true);
  await page.locator('#miniResume').tap();
  const old=await page.evaluate(()=>probe.game.pending.session.players[3].strokes);await page.getByRole('button',{name:'胖虎选左',exact:true}).tap();
  await page.waitForFunction(old=>probe.game.pending.session.players[3].strokes===old+1,old);
  await page.locator('#miniPause').tap();
  await page.locator('#miniResume').tap();
  await page.screenshot({path:'test-results/rc20-obstacle-touch-p4.png'});
  const buttonBox=await defense.boundingBox();assert.ok(buttonBox.width>=140);assert.ok(buttonBox.height>=48);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/rc20-obstacle-touch-p4-portrait.png'});
  const portraitBox=await defense.boundingBox();assert.ok(portraitBox.width>=140);assert.ok(portraitBox.height>=48);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.evaluate(()=>{const p=probe.game.pending.session.players[3];p.mode=16;p.animation=7;p.age=0;p.speed=0;});
  await page.waitForFunction(()=>document.querySelector('.miniRaceFeedback').textContent.includes('恢复中'));
  await page.waitForFunction(()=>probe.game.pending.session.players[3].mode!==16);
  const recovered=await page.evaluate(()=>probe.game.pending.session.players[3].strokes);
  await page.getByRole('button',{name:'胖虎选左',exact:true}).tap();
  await page.waitForFunction(n=>probe.game.pending.session.players[3].strokes===n+1,recovered);
  await page.evaluate(()=>probe.dispose());
  assert.deepEqual(errors,[]);
  fs.writeFileSync('test-results/rc20-obstacle-touch-report.json',JSON.stringify({before,after:result,checks:['user screenshot score/time gap reproduced with native tick rules','all 12 P4 touches change P4 world/strokes while offscreen','live rear-view animation remains visible without changing native camera','hold defense enters mode8 and shows defense feedback','touchEnd releases defense','pause freezes ticks and disables input; resume accepts next tap','landscape and portrait control buttons exceed 140x48 and fit width','collision recovery status displays; native recovery finishes and next tap accelerates'],errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
