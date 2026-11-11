const assert=require('node:assert/strict');
const {chromium}=require('../app/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:640,height:360}});
    const origin=process.env.TEST_ORIGIN || 'http://127.0.0.1:5187';
    await page.route(origin+'/controls-harness',route=>route.fulfill({contentType:'text/html',body:'<main id="stage" style="width:100vw;height:100vh"></main>'}));
    await page.goto(origin+'/controls-harness');
    await page.evaluate(async()=>{
      const {mountPcControls,bindMiniDevices}=await import('/src/pc-controls.ts');
      const stage=document.querySelector('main');window.mockPads=[];
      Object.defineProperty(navigator,'getGamepads',{value:()=>window.mockPads});
      window.settings=()=>mountPcControls(stage,()=>stage.replaceChildren());
      window.bind=(id)=>{window.device?.dispose();window.device=bindMiniDevices(stage,[true,true,true,false],id,()=>true);};
      window.settings();
    });
    const select=slot=>page.getByRole('combobox',{name:'P'+slot+' 控制设备'});
    assert.equal(await select(1).inputValue(),'4');
    await select(1).selectOption('5');assert.equal(await select(3).inputValue(),'4');
    await page.getByRole('button',{name:'取消'}).click();await page.evaluate(()=>window.settings());
    assert.equal(await select(1).inputValue(),'4');
    await select(1).selectOption('5');await page.getByRole('button',{name:'保存'}).click();
    await page.evaluate(()=>window.bind(0));
    const sample=()=>page.evaluate(()=>window.device.sample());
    await page.keyboard.down('a');assert.deepEqual(await sample(),[4,0,0,0]);assert.deepEqual(await sample(),[4,0,0,0]);
    await page.keyboard.up('a');assert.deepEqual(await sample(),[0,0,0,0]);
    await page.keyboard.press('ArrowRight');assert.deepEqual(await sample(),[0,0,8,0]);
    await page.mouse.click(10,10,{button:'right'});assert.deepEqual(await sample(),[0,8,0,0]);
    await page.evaluate(()=>window.bind(2));await page.keyboard.down('d');assert.deepEqual(await sample(),[8,0,0,0]);assert.deepEqual(await sample(),[0,0,0,0]);await page.keyboard.up('d');
    await page.evaluate(()=>{window.device.dispose();window.mockPads=[{connected:true,axes:[0],buttons:[]}];window.settings();});
    await page.getByRole('button',{name:'重设'}).click();assert.equal(await select(1).inputValue(),'0');
    await page.getByRole('button',{name:'保存'}).click();await page.evaluate(()=>{window.bind(4);window.mockPads[0].axes[0]=1;});
    assert.deepEqual(await sample(),[8,0,0,0]);assert.deepEqual(await sample(),[8,0,0,0]);
    await page.evaluate(()=>window.mockPads=[]);assert.deepEqual(await sample(),[0,0,0,0]);
    console.log('Controller settings, swap, cancel/save/Reset, quick taps, held keys, mouse and analog defense passed.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
