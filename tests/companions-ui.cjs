const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const E=await import('../app/src/engine.mjs'),F=await import('../app/src/effects.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json')),g=E.createGame(map,{startDate:'2000-05-02'});
 ['original-1','original-8','original-35','original-23'].forEach((item,i)=>F.applyEffect(g.players[i],item,i));g.players.forEach(p=>p.control='human');
 const page=await browser.newPage({viewport:{width:640,height:800},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),g);await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();await page.waitForFunction(()=>!window.__game.snapshot().busy);
 await page.screenshot({path:'test-results/companions.png'});assert.deepEqual(errors,[]);console.log('Companion visuals passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
