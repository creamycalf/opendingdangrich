const {chromium}=require('../app/node_modules/playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const revision=process.env.QA_REVISION||'rc8';
const output='test-results/'+revision+'-android';
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
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await tap(page.locator('#titleGate'));await tap(named('大富翁'));await tap(page.locator('#newGame'));
    if(await named('设置新游戏').isVisible())await tap(named('设置新游戏'));
    const loadStart=Date.now();
    for(const label of ['确定角色','确定地图'])await tap(named(label));
    await page.evaluate(()=>{performance.setResourceTimingBufferSize(5000);performance.clearResourceTimings();});
    const mapLoadStart=Date.now();await tap(named('开始游戏'));
    await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy,null,{timeout:120000});
    const newGameMs=Date.now()-loadStart;
    const mapLoadMs=Date.now()-mapLoadStart;
    const mapResources=await page.evaluate(()=>{
      const urls=performance.getEntriesByType('resource').map(r=>r.name);
      return {sheets:urls.filter(u=>/\/sprite-atlas\/map-\d+-\d+\.png/.test(u)),tiles:urls.filter(u=>/\/maps\/\d+\/.*\.png/.test(u))};
    });
    assert.equal(await page.locator('#bells').getAttribute('aria-label'),'步行积分 0');
    const colors=await page.locator('#board').evaluate(canvas=>{
      const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const colors=new Set();
      for(let n=0;n<pixels.length;n+=64)colors.add(pixels[n]*65536+pixels[n+1]*256+pixels[n+2]);
      return colors.size;
    });
    assert.ok(colors>100,'Empty board canvas: '+colors+' colors');
    fs.writeFileSync(output+'-surface.png',execFileSync(process.env.ADB_PATH||'F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/platform-tools/adb.exe',['-s','emulator-5580','exec-out','screencap','-p'],{maxBuffer:16000000}));
    const before=await page.evaluate(()=>window.__game.snapshot().game.players[0].at);
    await tap(page.locator('#roll'));
    await page.waitForFunction(()=>window.__game.snapshot().game.dice>0);
    const rolled=await page.evaluate(()=>window.__game.snapshot().game);
    assert.equal(rolled.pcAnimatedRoll,true);
    assert.equal(rolled.randomVersion,'pc-v126');
    assert.ok(rolled.rollPlan.faces.length>=44);
    assert.equal(rolled.rollPlan.result,rolled.dice);
    const end=Date.now()+30000;
    while(Date.now()<end){
      const state=await page.evaluate(()=>window.__game.snapshot());
      if(state.game.players[0].at!==before){
        await page.waitForFunction(()=>!window.__game.snapshot().busy);
        const visible=await page.evaluate(()=>window.__game.snapshot().game);
        assert.ok(visible.players[0].walkPoints>0);
        assert.equal(await page.locator('#bells').getAttribute('aria-label'),'步行积分 '+Math.trunc(visible.players[visible.turn].walkPoints));
        assert.deepEqual(errors,[]);
        fs.writeFileSync(output+'-turn.json',JSON.stringify({passed:true,newGameMs,mapLoadMs,mapResources,colors,before,after:state.game.players[0].at,dice:state.game.dice,map:state.game.map,maxYears:state.game.maxYears,walkPoints:visible.players[0].walkPoints,rollFaces:rolled.rollPlan.faces}));
        await page.screenshot({path:output+'-board.png'});return;
      }
      const route=page.locator('#routes button').first();if(!state.busy&&await route.isVisible())await tap(route);
      await page.waitForTimeout(120);
    }
    throw Error('Roll did not advance the human player');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
