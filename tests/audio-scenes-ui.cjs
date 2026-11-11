const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true,isMobile:true}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);
 const state=()=>page.evaluate(()=>window.__game.audio());
 await page.locator('#titleGate').tap();await page.waitForFunction(()=>window.__game.audio().events?.some(e=>e.kind==='voice'&&e.bank===1&&[0,22].includes(e.clip)&&e.status==='started'));
 assert((await state()).events.some(e=>e.kind==='sfx'&&e.clip===11&&e.status==='started'));checks.push('touch title gate starts original greeting voice and door sound');
 await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.waitForFunction(()=>window.__game.audio().events.some(e=>e.kind==='voice'&&e.bank===1&&e.clip===1&&e.status==='started'));
 await page.locator('#newGame').tap();await page.waitForFunction(()=>window.__game.audio().events.some(e=>e.kind==='voice'&&e.bank===1&&e.clip===2&&e.status==='started'));
 await page.getByRole('button',{name:'返回',exact:true}).tap();checks.push('board submenu and new game use original menu speech IDs');
 await page.getByRole('button',{name:'小游戏',exact:true}).tap();await page.waitForFunction(()=>window.__game.audio().events.some(e=>e.kind==='voice'&&e.bank===1&&e.clip===5&&e.status==='started'));
 await page.getByRole('button',{name:'练习模式',exact:true}).tap();await page.getByRole('button',{name:'确定角色',exact:true}).tap();
 await page.waitForFunction(()=>window.__game.audio().track===5&&window.__game.audio().playing);checks.push('standalone minigame practice menu plays original minigame music rather than title music');
 await page.locator('#modal').getByRole('button',{name:'返回主菜单',exact:true}).tap();await page.waitForFunction(()=>window.__game.audio().track===2&&window.__game.audio().playing);checks.push('exit standalone arcade restores title music');
 const diagnostics=await state();assert.deepEqual(errors,[]);assert.deepEqual(diagnostics.errors,[]);fs.mkdirSync('test-results/audio-rc16',{recursive:true});fs.writeFileSync('test-results/audio-rc16/scenes.json',JSON.stringify({checks,errors,diagnostics},null,2));console.log(JSON.stringify({checks,errors},null,2));await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
