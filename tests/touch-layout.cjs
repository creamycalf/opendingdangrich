const {chromium}=require('../app/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const out='test-results/touch-layout';fs.mkdirSync(out,{recursive:true});
  const report=[];
  try{
    for(const [width,height] of [[640,320],[915,412],[360,640]]){
      const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
      const p=await ctx.newPage();await p.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5199');
      await p.waitForFunction(()=>!!window.__game);await p.locator('#titleGate').tap();
      const menu=p.getByRole('button',{name:'大富翁',exact:true});
      await Promise.race([menu.waitFor(),p.locator('#newGame').waitFor()]);
      if(await menu.isVisible())await menu.tap();
      await p.locator('#newGame').tap();
      async function check(stage){
        await p.waitForFunction(()=>Array.from(document.querySelectorAll('#modal img.actionIcon')).every(im=>im.complete&&im.naturalWidth>0));
        const info=await p.locator('#modal').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight,top:el.scrollTop, page:document.scrollingElement.scrollTop}));
        assert(info.content<=info.height+1,JSON.stringify({stage,width,height,info}));
        assert.equal(info.top,0);assert.equal(info.page,0);
        await p.screenshot({path:out+'/'+width+'-'+stage+'.png'});report.push({viewport:{width,height},stage,...info});
      }
      await check('players');
      await p.getByRole('button',{name:'选择小夫',exact:true}).tap();
      await p.getByRole('button',{name:'确定角色'}).tap();
      for(let shift=0;shift<3;shift++)await p.getByRole('button',{name:'下一张地图'}).tap();await check('maps');
      await p.getByRole('button',{name:'角色与玩家'}).tap();
      assert.equal(await p.locator('#character0').inputValue(),'suneo');
      assert.equal(await p.locator('#mapChoice').inputValue(),'7');
      await p.getByRole('button',{name:'确定角色',exact:true}).tap();await p.getByRole('button',{name:'确定地图',exact:true}).tap();await check('years');await p.getByRole('button',{name:'8 年',exact:true}).tap();await p.getByRole('button',{name:'开始游戏',exact:true}).tap();
      await p.waitForFunction(()=>window.__game?.snapshot().active);
      await p.locator('#menu').tap();await check('menu');
      await p.getByRole('button',{name:'声音设置',exact:true}).tap();await check('audio');
      const game=await p.evaluate(()=>window.__game.snapshot().game);
      const engine=await import('../app/src/engine.mjs');
      game.players[game.turn].inventory=Object.keys(engine.ITEMS);
      await p.addInitScript(g=>localStorage.setItem('dingdang.touch.v2',JSON.stringify(g)),game);
      await p.reload();await p.locator('#titleGate').tap();
      await p.getByRole('button',{name:'大富翁',exact:true}).tap();await p.locator('#continueGame').tap();
      await p.waitForFunction(()=>window.__game?.snapshot().active);
      await p.locator('#items').tap();await check('pocket');
      await p.getByRole('button',{name:'下一页'}).tap();await check('pocket-next');
      await p.getByRole('button',{name:'返回游戏',exact:true}).tap();
      await p.reload();await p.locator('#titleGate').tap();
      await p.getByRole('button',{name:'小游戏',exact:true}).tap();await p.getByRole('button',{name:'练习模式',exact:true}).tap();
      await p.getByRole('button',{name:'确定角色',exact:true}).tap();await check('arcade');
      await p.locator('.dialogChoices button:visible').first().tap();
      await p.getByRole('button',{name:'开始小游戏',exact:true}).tap();
      await p.locator('#miniPause').waitFor();await p.locator('#miniPause').tap();await check('arcade-paused');
      await ctx.close();
    }
    fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log('passed',report.length);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

