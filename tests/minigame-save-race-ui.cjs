const {chromium}=require('../app/node_modules/playwright');const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:320,height:640},hasTouch:true});await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);
 await page.evaluate(async()=>{
  const E=await import('/src/engine.mjs'),M=await import('/src/minigames.mjs'),V=await import('/src/minigame-view.ts');
  const map=await(await fetch('/assets/maps/4.json')).json(),g=E.createGame(map),host=document.createElement('main');document.body.replaceChildren(host);
  g.phase='prompt';g.pending={kind:'minigame',session:M.createMiniGame(6,g.players,n=>E.random(g,n))};g.pending.session.stage='playing';
  window.race={writes:[],releases:[],errors:[],game:()=>JSON.parse(JSON.stringify(g))};
  window.race.dispose=await V.mountMiniGame(host,{read:()=>g,tick:inputs=>M.tickMiniGame(g.pending.session,g.players,inputs,n=>E.random(g,n)),valid:()=>true,autostart:true,exit:()=>{},finish:()=>{},error:e=>window.race.errors.push(String(e)),save:()=>{
   window.race.writes.push(JSON.parse(JSON.stringify(g)));return new Promise(resolve=>window.race.releases.push(resolve));
  }});
 });
 await page.waitForFunction(()=>window.race.writes.length===1);await page.waitForTimeout(180);
 await page.locator('#miniPause').tap();const paused=await page.evaluate(()=>window.race.game());
 await page.waitForFunction(()=>window.race.writes.length===2);await page.waitForTimeout(150);
 const data=await page.evaluate(()=>({writes:window.race.writes,game:window.race.game(),errors:window.race.errors}));
 assert.ok(data.writes[0].pending.session.remaining>paused.pending.session.remaining);
 assert.deepEqual(data.writes[1],paused);assert.deepEqual(data.game,paused);assert.deepEqual(data.errors,[]);
 await page.evaluate(()=>{window.race.releases.forEach(r=>r());window.race.dispose();});
 fs.writeFileSync('test-results/minigame-save-race-report.json',JSON.stringify({passed:true,checks:['pause enqueues exact latest state while periodic save is still pending','paused game remains frozen until queued saves complete']},null,2));console.log('Minigame delayed-save pause regression passed');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
