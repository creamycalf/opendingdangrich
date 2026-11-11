const {chromium}=require('../app/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const errors=[],checks=[];try{
 const context=await browser.newContext({viewport:{width:915,height:412},isMobile:true,hasTouch:true});
 const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);
 await page.locator('#titleGate').waitFor({state:'visible'});
 await page.screenshot({path:'test-results/pc-title-splash.png'});
 await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#newGame').waitFor({state:'visible'});
 assert(await page.locator('#continueGame').isDisabled());
 await page.screenshot({path:'test-results/pc-title-menu.png'});
 checks.push('original title gate, animated door and unavailable save');
 await page.setViewportSize({width:412,height:915});
 await page.screenshot({path:'test-results/pc-title-portrait.png'});
 const box=await page.locator('.pcTitleStage').boundingBox();assert(Math.abs(box.width/box.height-4/3)<0.001);assert(box.x>=-1&&box.x+box.width<=413);
 await page.locator('#newGame').tap();
 await page.getByRole('button',{name:'选择小夫',exact:true}).tap();
 assert.equal(await page.locator('#character0').inputValue(),'suneo');
 await page.getByRole('button',{name:'选择大雄',exact:true}).tap();
 assert.equal(await page.locator('#character1').inputValue(),'suneo');
 assert.equal(await page.locator('#character0').inputValue(),'nobita');
 await page.screenshot({path:'test-results/pc-selection-portrait.png'});
 await page.setViewportSize({width:915,height:412});
 await page.screenshot({path:'test-results/pc-selection-landscape.png'});
 checks.push('touch selection, duplicate prevention, original portraits and figures');
 await page.getByRole('button',{name:'确定角色',exact:true}).tap();await page.getByRole('button',{name:'确定地图',exact:true}).tap();await page.getByRole('button',{name:'开始游戏',exact:true}).tap();
 await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
 await page.locator('#roll').tap();assert(await page.locator('#diceDisplay').isVisible());
 checks.push('portrait retains scene aspect ratio and new-game touch enters dice flow');
 await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();
 await page.waitForFunction(()=>window.__game.snapshot().active);checks.push('cold resume through original-art menu');
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/pc-selection-ui-report.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(checks);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

