const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const adb=(...args)=>execFileSync(process.env.ADB_PATH||'F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',['-s','emulator-5580',...args],{encoding:'utf8'}).trim();
(async()=>{
  adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+adb('shell','pidof','local.dingdang.touch'));
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true});
  try {
    const page=browser.contexts()[0].pages()[0], session=await page.context().newCDPSession(page);
    async function tap(item){
      await item.waitFor({state:'visible'});const r=await item.boundingBox();
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    const named=name=>page.getByRole('button',{name,exact:true});
    await tap(page.locator('#titleGate'));await tap(named('大富翁'));await tap(page.locator('#newGame'));
    if(await named('设置新游戏').isVisible())await tap(named('设置新游戏'));
    for(const label of ['确定角色','确定地图','开始游戏'])await tap(named(label));
    await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
    const before=await page.evaluate(()=>window.__game.snapshot().game.players[0].at);
    await tap(page.locator('#roll'));
    await page.waitForFunction(()=>window.__game.snapshot().game.dice>0);
    const end=Date.now()+30000;
    while(Date.now()<end){
      const state=await page.evaluate(()=>window.__game.snapshot());
      if(state.game.players[0].at!==before){
        fs.writeFileSync('test-results/rc6-android-turn.json',JSON.stringify({before,after:state.game.players[0].at,dice:state.game.dice,map:state.game.map,maxYears:state.game.maxYears}));return;
      }
      const route=page.locator('#routes button').first();if(!state.busy&&await route.isVisible())await tap(route);
      await page.waitForTimeout(120);
    }
    throw Error('Roll did not advance the human player');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
