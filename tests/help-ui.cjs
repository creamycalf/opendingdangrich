const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const revision=process.env.QA_REVISION||'rc14',checks=[],errors=[];
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const [width,height] of [[640,320],[360,640]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5275');await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.locator('#instructions').tap();
  const text=await page.locator('#modalContent').innerText();for(const s of ['沿道路自动前进','早期版本的存档在路口仍需点方向','连续负现金15天会破产','周日休息','六名常规角色','可解锁的黄耳'])assert(text.includes(s),s);
  const button=page.getByRole('button',{name:'返回主菜单',exact:true}),r=await button.boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);
  await page.screenshot({path:`test-results/${revision}-help-${width}.png`});await button.tap();assert(await page.locator('#titleScreen').isVisible());checks.push({width,height,correctRules:true,returnButtonVisible:true});await page.close();
 }assert.deepEqual(errors,[]);fs.writeFileSync(`test-results/${revision}-help-ui.json`,JSON.stringify({status:'passed',checks,errors},null,2));console.log(checks.length,'help checks passed');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
