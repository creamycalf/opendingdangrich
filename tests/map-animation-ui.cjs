const {chromium}=require('../app/node_modules/playwright');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const E=await import('../app/src/engine.mjs');const errors=[],checks=[];
 for(const id of [0,4,6]){
  const map=JSON.parse(fs.readFileSync(`app/public/assets/maps/${id}.json`)),g=E.createGame(map,{startDate:'2000-05-02'});
  const lot=map.cells.findIndex(c=>id===4?c.event===6:c.event===15),cell=map.cells[lot];
  const near=map.cells.findIndex(c=>E.walkable(c)&&Math.abs(c.x-cell.x)+Math.abs(c.y-cell.y)===1);
  assert.ok(near>=0);g.players[0].at=near;for(const p of g.players)p.control='human';
  const page=await browser.newPage({viewport:{width:640,height:800},isMobile:true,hasTouch:true});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),g);await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  await page.screenshot({path:`test-results/map-animated-${id}.png`});checks.push(`map ${id} original NPC/bank sprites render beside player`);await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/map-animation-ui-report.json',JSON.stringify({passed:true,checks,errors},null,2));console.log('Map animation UI passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
