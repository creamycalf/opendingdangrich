const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
let browser;
(async()=>{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:915,height:412},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(let id=0;id<8;id++){
    await page.goto('http://127.0.0.1:5178');await page.waitForFunction(()=>!!window.__game);
    await page.locator('#newGame').tap();
    if(id)await page.getByRole('button',{name:'设置新游戏',exact:true}).tap();
    await page.locator('#mapChoice').selectOption(String(id));
    for(let p=0;p<4;p++)await page.locator('#control'+p).selectOption('human');
    await page.getByRole('button',{name:'开始游戏',exact:true}).tap();
    await page.waitForFunction(id=>window.__game.snapshot().active&&window.__game.snapshot().game.map===id,id);
    const before=await page.evaluate(()=>window.__game.snapshot().game);
    assert.equal(before.map,id);
    await page.locator('#overview').tap();
    await page.screenshot({path:`test-results/map-${id}-overview.png`});
    await page.reload();await page.waitForFunction(()=>!!window.__game);
    await page.locator('#continueGame').tap();
    await page.waitForFunction(id=>window.__game.snapshot().active&&window.__game.snapshot().game.map===id,id);
    assert.deepEqual(await page.evaluate(()=>window.__game.snapshot().game),before);
    await page.locator('#roll').tap();
    await page.waitForFunction(()=>window.__game.snapshot().game.dice>0&&!window.__game.snapshot().game.dicePending);
    const after=await page.evaluate(()=>window.__game.snapshot().game);
    assert.equal(after.map,id);assert.ok(after.dice>=1&&after.dice<=6);
    checks.push({map:id,setup:true,reload:true,dice:true});
    await page.locator('#pause').tap();
    await page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();
  }
  // A broken destination asset must not erase the existing map's saved game.
  const saved=await page.evaluate(()=>localStorage.getItem('dingdang.touch.v2'));
  await page.route('**/assets/maps/0.json',route=>route.abort());
  await page.locator('#newGame').tap();await page.getByRole('button',{name:'设置新游戏',exact:true}).tap();
  await page.locator('#mapChoice').selectOption('0');await page.getByRole('button',{name:'开始游戏',exact:true}).tap();
  await page.waitForFunction(()=>document.getElementById('setupError').textContent.length>0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('dingdang.touch.v2')),saved);
  assert.equal(await page.getByRole('button',{name:'开始游戏',exact:true}).isEnabled(),true);
  assert.deepEqual(errors,[]);
  fs.writeFileSync('test-results/maps-ui-report.json',JSON.stringify({checks,failedMapLoadPreservesSave:true,errors,androidDeviceTested:false},null,2));
  console.log('8 map setup/reload/dice checks and failed-load save preservation passed');
  await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
