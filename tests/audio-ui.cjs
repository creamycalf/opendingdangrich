const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
 const E=await import('../app/src/engine.mjs'),M=await import('../app/src/minigames.mjs'),map=JSON.parse(fs.readFileSync('app/public/assets/maps/4.json'));
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:320,height:592},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);
 await page.locator('#soundSettings').tap();await page.waitForFunction(()=>window.__game.audio().playing&&window.__game.audio().context==='running');
 assert.equal((await page.evaluate(()=>window.__game.audio())).track,2);
 await page.getByLabel('音乐音量',{exact:true}).fill('0');await page.getByLabel('角色语音',{exact:true}).selectOption('cantonese');
 assert.equal((await page.evaluate(()=>window.__game.audio())).playing,false);
 await page.reload();await page.waitForFunction(()=>!!window.__game);assert.equal((await page.evaluate(()=>window.__game.audio())).settings.music,0);assert.equal((await page.evaluate(()=>window.__game.audio())).settings.language,'cantonese');
 await page.locator('#soundSettings').tap();await page.getByLabel('音乐音量',{exact:true}).fill('45');await page.getByRole('button',{name:'返回',exact:true}).tap();checks.push('touch settings, mute, volume and language survive reload');
 const g=E.createGame(map,{startDate:'2000-04-03'});g.players.forEach(p=>p.control='human');
 await page.evaluate(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),g);await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();await page.waitForFunction(()=>!window.__game.snapshot().busy);
 await page.locator('#roll').tap();await page.waitForFunction(()=>window.__game.audio().activeEffects>0);assert.equal((await page.evaluate(()=>window.__game.audio())).track,2);
 await page.waitForFunction(()=>!window.__game.snapshot().busy);await page.locator('#pause').tap();assert.equal((await page.evaluate(()=>window.__game.audio())).playing,false);assert.equal((await page.evaluate(()=>window.__game.audio())).activeEffects,0);
 await page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();checks.push('real roll plays original voices/SFX; menu stops music and transient effects');
 const mini=E.createGame(map,{startDate:'2000-05-02'});mini.players.forEach(p=>p.control='human');mini.phase='prompt';mini.pending={kind:'minigame',session:M.createMiniGame(6,mini.players,n=>E.random(mini,n))};
 await page.evaluate(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),mini);await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();await page.getByRole('button',{name:'开始小游戏',exact:true}).tap();
 await page.waitForFunction(()=>window.__game.audio().playing);assert.equal((await page.evaluate(()=>window.__game.audio())).track,5);
 const s=await page.evaluate(()=>window.__game.snapshot().game.pending.session),p=s.players[0],left=p.ring[(p.start+6)%14]===p.ring[p.target];
 await page.getByRole('button',{name:mini.players[0].name+'选'+(left?'左':'右'),exact:true}).tap();await page.waitForFunction(()=>window.__game.audio().activeEffects>0);
 await page.locator('#miniPause').tap();await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>window.__game.audio())).playing,false);
 await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();await page.locator('#miniPause').waitFor();await page.waitForTimeout(300);assert.equal((await page.evaluate(()=>window.__game.audio())).playing,false);
 await page.locator('#miniPause').tap();await page.waitForFunction(()=>window.__game.audio().playing);checks.push('minigame DAT sounds play; pause and cold resume remain silent until continuing');
 // Exercise the same document visibility path Android WebView uses on background.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(100);
 assert.equal((await page.evaluate(()=>window.__game.audio())).playing,false);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>window.__game.audio())).playing,false);
 await page.locator('#miniPause').tap();await page.waitForFunction(()=>window.__game.audio().playing);checks.push('visibility pause silences audio and requires an explicit minigame resume');
 // Browser decoder verification, not just filename or header checks.
 const decoded=await page.evaluate(async()=>{const c=await (await fetch('assets/audio/catalog.json')).json(),ctx=new AudioContext(),urls=[...Object.values(c.sfx),...Object.values(c.voices).flatMap(v=>[0,1,2,3,4,5].map(id=>v[id+'-2-36']))];for(const m of urls){const b=await ctx.decodeAudioData(await (await fetch(m.url)).arrayBuffer());if(Math.abs(b.duration-m.frames/m.rate)>.001||b.numberOfChannels!==m.channels)throw Error(m.url);}await ctx.close();return urls.length;});
 checks.push(decoded+' original WAV clips decoded by browser audio engine');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual((await page.evaluate(()=>window.__game.audio())).errors,[]);assert.deepEqual(errors,[]);
 fs.writeFileSync('test-results/audio-ui-report.json',JSON.stringify({checks,errors},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exit(1);});
