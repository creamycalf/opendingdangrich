const {chromium}=require('../app/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const revision=process.env.QA_REVISION||'rc15';
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.ARCADE_TEST_URL||process.env.TEST_ORIGIN||'http://127.0.0.1:5187');
    await page.waitForFunction(()=>!!window.__game,{},{timeout:60000});
    await page.locator('#titleGate').tap();
    await page.getByRole('button',{name:'小游戏',exact:true}).tap();
    await page.getByRole('button',{name:'练习模式',exact:true}).tap();
    await page.getByRole('button',{name:'确定角色',exact:true}).tap();
    const checkpoint='prior-board-session';
    const rounds=[];
    await page.evaluate(s=>localStorage.setItem('dingdang.touch.v2',s),checkpoint);
    const menu=page.locator('#modalContent');
    const names=await menu.locator('.dialogChoices button').allTextContents();
    assert.equal(names.length,8);
    for(const name of names){
      if(!await menu.getByRole('button',{name,exact:true}).isVisible())await menu.getByRole('button',{name:'下一页'}).tap();
      await menu.getByRole('button',{name,exact:true}).tap();
      await menu.getByRole('button',{name:'开始小游戏',exact:true}).tap();
      const play=page.locator('.miniPlayer.human button').first();await play.waitFor();if(await play.isEnabled())await play.tap();
      await page.locator('#miniPause').tap();
      await page.locator('.miniLeave').tap();
    }
    await menu.getByRole('button',{name:'放大光线比赛',exact:true}).tap();
    await menu.getByRole('button',{name:'开始小游戏',exact:true}).tap();
    await menu.getByRole('button',{name:'再玩一次'}).waitFor({timeout:45000});
    await menu.getByRole('button',{name:'返回主菜单'}).tap();
    await page.getByRole('button',{name:'小游戏',exact:true}).tap();
    await page.getByRole('button',{name:'比赛模式',exact:true}).tap();
    await page.getByRole('button',{name:'确定角色',exact:true}).tap();
    for(let round=0;round<8;round++){
      await menu.getByRole('button',{name:'开始小游戏',exact:true}).tap();
      await page.locator('#miniPause').waitFor();
      const button=menu.getByRole('button',{name:round===7?'返回主菜单':'下一场',exact:true});
      await button.waitFor({timeout:120000});
      const result=await menu.innerText();assert.match(result,/总分/);
      rounds.push({round:round+1,result});console.log('Competition round',round+1,'finished');
      await page.screenshot({path:`test-results/${revision}-arcade-round-${round+1}.png`});
      await button.tap();
    }
    assert.equal(await page.evaluate(()=>localStorage.getItem('dingdang.touch.v2')),checkpoint);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(`test-results/${revision}-arcade.json`,JSON.stringify({practiceGames:names,rounds,savePreserved:true,pageErrors:errors},null,2));
    console.log('Eight practice games and full eight-round competition returned to title with the board save intact.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
