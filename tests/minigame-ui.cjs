const {chromium}=require('../app/node_modules/playwright');
const fs=require('fs'),assert=require('node:assert/strict');let browser;
const prefix=process.env.QA_REVISION?process.env.QA_REVISION+'-':'';
(async()=>{
  const E=await import('../app/src/engine.mjs'),M=await import('../app/src/minigames.mjs'),C=await import('../app/src/commands.mjs');
  const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
  const rules=g=>{for(const key of ['mapRevision','randomVersion','propertyAiVersion','pcEconomyVersion','itemAiVersion','pcNavigationVersion'])assert.equal(g[key],'pc-v126',key);};
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const errors=[],checks=[];
  for(const [id,humans] of [[6,1],[6,4],[2,1],[2,4],[3,1],[3,4],[4,1],[4,4],[5,1],[5,4],[7,1],[7,4],[0,1],[0,4],[1,1],[1,4]].filter(([id])=>!process.env.MINI_IDS||process.env.MINI_IDS.split(',').includes(String(id)))){
    console.log('Starting minigame',id,'humans',humans);
    const game=E.createGame(map,{startDate:'2000-05-02'});game.players.forEach((p,i)=>p.control=i<humans?'human':'ai');
    rules(game);
    game.phase='prompt';game.pending={kind:'minigame',session:M.createMiniGame(id,game.players,n=>E.random(game,n))};
    // Deterministic collision setup, using ordinary validated game state. The
    // full random trajectories are checked independently against the EXE.
    if(id===0)game.pending.session.drops.slice(0,4).forEach((d,i)=>Object.assign(d,{x:172+i*100,y:220,kind:0,animation:40,mode:2,age:0,ended:0}));
    const context=await browser.newContext({viewport:{width:320,height:592},isMobile:true,hasTouch:true});
    await context.addInitScript(g=>{if(!localStorage.getItem('seeded')){localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));localStorage.setItem('seeded','1');}},game);
    const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5178');
    try{await page.waitForFunction(()=>!!window.__game);}catch(e){console.error('Loading state:',await page.locator('#loading').textContent());throw e;}
    await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();
    await page.getByRole('button',{name:'开始小游戏',exact:true}).tap();await page.locator('#miniPause').waitFor();
    if(id===3)await page.waitForTimeout(100);
    const snap=()=>page.evaluate(()=>window.__game.snapshot().game);
    for(let i=0;i<humans;i++){
      if(id===0||id===1)continue;
      if(id===7){
        for(let n=0;n<120;n++){
          const p=(await snap()).pending.session.players[i];if(p.score>=1)break;
          if(p.mode===8&&!p.armed&&p.spring.age>=7&&p.spring.age<=12){const b=page.getByRole('button',{name:game.players[i].name+'选左',exact:true}),box=await b.boundingBox();assert.ok(box.width>=44&&box.height>=44);await b.tap();}
          await page.waitForTimeout(40);
        }
        continue;
      }
      if(id===5){
        for(let n=0;n<160;n++){
          const p=(await snap()).pending.session.players[i];if(p.score>=1)break;
          if(p.actor.mode===2&&p.target.mode===1){const left=(p.selector.choice-p.target.choice+3)%3===1;
            const b=page.getByRole('button',{name:game.players[i].name+'选'+(left?'左':'右'),exact:true}),box=await b.boundingBox();assert.ok(box.width>=44&&box.height>=44);await b.tap();}
          await page.waitForTimeout(45);
        }
        continue;
      }
      const p=(await snap()).pending.session.players[i],left=id===6?p.ring[(p.start+6)%14]===p.ring[p.target]:true;
      const button=page.getByRole('button',{name:game.players[i].name+'选'+(left?'左':'右'),exact:true});const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44);await button.tap();
      if(id===2||id===3){await page.waitForTimeout(45);for(let n=0;n<(id===2?7:3);n++){await page.getByRole('button',{name:game.players[i].name+'选'+(n%2===0?'右':'左'),exact:true}).tap();await page.waitForTimeout(45);}}
      if(id===4){for(let n=0;n<3;n++){await page.waitForTimeout(80);await button.tap();}}
    }
    if(id===0){
      await page.waitForFunction(h=>window.__game.snapshot().game.pending.session.players.slice(0,h).every(p=>p.score>=1),humans);
      await page.waitForTimeout(500);
      const b=page.getByRole('button',{name:game.players[0].name+'选左',exact:true}),box=await b.boundingBox();assert.ok(box.width>=44&&box.height>=44);
      const before=(await snap()).pending.session.players[0].x;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
      assert.ok((await snap()).pending.session.players[0].x<before);await page.waitForTimeout(100);const released=(await snap()).pending.session.players[0].x;await page.waitForTimeout(150);assert.equal((await snap()).pending.session.players[0].x,released);
    }
    if(id===1){
      for(let n=0;n<180;n++){
        const s=(await snap()).pending.session;if(s.players.slice(0,humans).every(p=>p.score>=1))break;
        for(let i=0;i<humans;i++){
          const current=(await snap()).pending.session,p=current.players[i];
          if(current.phase===2&&p.mode!==3&&p.mode!==4&&p.mode!==6&&p.pose!==current.leader.pose){
            const b=page.getByRole('button',{name:game.players[i].name+'选'+((p.pose^1)===current.leader.pose?'左':'右'),exact:true}),box=await b.boundingBox();assert.ok(box.width>=44&&box.height>=44);await b.tap();
          }
        }
        await page.waitForTimeout(30);
      }
    }
    await page.waitForFunction(h=>window.__game.snapshot().game.pending.session.players.slice(0,h).every(p=>p.score>=1),humans);
    if(id===4){
      const guard=page.getByRole('button',{name:game.players[0].name+'选右',exact:true}),b=await guard.boundingBox();
      await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
      // Native hit mode 16 ignores input until its 21-frame animation ends.
      // In four-player runs player 0 may have been hit while the others scored.
      await page.waitForFunction(()=>window.__game.snapshot().game.pending.session.players[0].mode===8,{},{timeout:5000});
      await page.mouse.up();await page.waitForFunction(()=>window.__game.snapshot().game.pending.session.players[0].mode!==8);
    }
    await page.locator('#miniPause').tap();const paused=await snap();await page.waitForTimeout(350);assert.deepEqual(await snap(),paused);
    await page.screenshot({path:`test-results/${prefix}minigame${id}-${humans}human.png`});
    const replay=await page.evaluate(()=>window.__game.replay());assert.deepEqual(C.replayCommands(map,replay),paused);
    await page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();await page.reload();await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.locator('#miniPause').waitFor();
    const resumed=await snap();rules(resumed);assert.deepEqual(resumed,paused);assert.ok(resumed.pending.session.players[0].score>=1);
    await page.setViewportSize({width:915,height:412});await page.screenshot({path:`test-results/${prefix}minigame${id}-${humans}human-landscape.png`});
    assert.deepEqual(await snap(),resumed);checks.push(`game ${id}, ${humans} human: touch scoring, 44px controls, pause, save/resume, rotation and exact replay`);
    if(humans===1&&id===6){
      await page.locator('#miniPause').tap();await page.getByRole('button',{name:'领取奖励，返回棋盘',exact:true}).waitFor({timeout:30000});
      const result=await snap(),awards=M.miniRewards(result.pending.session);await page.getByRole('button',{name:'领取奖励，返回棋盘',exact:true}).tap();
      await page.waitForFunction(()=>window.__game.snapshot().game.pending?.kind!=='minigame');const after=await snap();
      // Stop subsequent AI actions before comparing their mutable balances.
      assert.equal(after.players[0].cash,result.players[0].cash+awards[0]);checks.push('600 ticks complete, reward collect returns to board');
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(`test-results/${prefix}minigame-ui-report.json`,JSON.stringify({map:'maps-v126/4',ruleVersions:['mapRevision','randomVersion','propertyAiVersion','pcEconomyVersion','itemAiVersion','pcNavigationVersion'],checks,errors},null,2));console.log(checks);await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exit(1);});
