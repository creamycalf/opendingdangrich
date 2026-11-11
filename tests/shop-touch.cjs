const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
let browser;
(async()=>{
  const E=await import('../app/src/engine.mjs');
  const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));
  map.jail=JSON.parse(fs.readFileSync('app/public/assets/flow-assets.json')).jail;
  const lot=map.cells.findIndex(c=>c.event===5&&E.adjacent(map,c.y*50+c.x).some(i=>E.walkable(map.cells[i])));
  const road=E.adjacent(map,lot).find(i=>E.walkable(map.cells[i]));
  const errors=[],checks=[];
  fs.mkdirSync('test-results/rc20-shop-touch',{recursive:true});
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const snapshot=page=>page.evaluate(()=>window.__game.snapshot().game);
  async function resume(page){
    await page.waitForFunction(()=>!!window.__game);
    await page.locator('#titleGate').tap();
    await page.getByRole('button',{name:'大富翁',exact:true}).tap();
    await page.locator('#continueGame').tap();
    await page.waitForFunction(()=>window.__game.snapshot().active);
    await page.getByRole('button',{name:'购买道具',exact:true}).waitFor();
  }
  async function visibleWithoutScroll(page,label){
    const b=page.getByRole('button',{name:label,exact:true});
    assert(await b.isVisible(),label+' must be visible');
    const bounds=await b.boundingBox(),viewport=page.viewportSize();
    assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,label+' must fit viewport');
    assert(bounds.height>=40,label+' must be a usable touch target');
    assert(await b.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),label+' must not be clipped or covered');
  }
  for(const viewport of [{width:640,height:320},{width:915,height:412},{width:360,height:640}]){
    const g=E.createGame(map,{seed:72,startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
    g.players[0].at=road;g.players[0].inventory=['air','air'];g.phase='prompt';g.pending={kind:'shop',lot};
    const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await context.addInitScript(game=>{if(!localStorage.getItem('fixture-seeded')){localStorage.setItem('dingdang.touch.v2',JSON.stringify(game));localStorage.setItem('fixture-seeded','yes');}},g);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await resume(page);
    for(const label of ['购买道具','卖出道具','离开商店','保存并返回主菜单'])await visibleWithoutScroll(page,label);
    await page.getByRole('button',{name:'卖出道具',exact:true}).tap();
    await visibleWithoutScroll(page,'离开商店');await visibleWithoutScroll(page,'返回商店');
    assert.equal(await page.getByRole('button',{name:/^购买 /}).count(),0);
    await page.getByRole('button',{name:'卖出 空气枪 · 获得 100',exact:true}).tap();
    assert.deepEqual((await snapshot(page)).players[0].inventory,['air']);
    assert.equal((await snapshot(page)).players[0].cash,1100);
    await page.getByRole('button',{name:'卖出 空气枪 · 获得 100',exact:true}).tap();
    assert.equal((await snapshot(page)).players[0].cash,1200);
    await page.getByRole('button',{name:'返回商店',exact:true}).tap();
    assert(await page.getByRole('button',{name:'卖出道具',exact:true}).isDisabled());
    await page.getByRole('button',{name:'购买道具',exact:true}).tap();
    assert.equal(await page.getByRole('button',{name:/^购买 空气枪/}).count(),0);
    assert.equal(await page.getByRole('button',{name:/^卖出 /}).count(),0);
    await visibleWithoutScroll(page,'离开商店');await visibleWithoutScroll(page,'返回商店');
    assert.equal(await page.locator('.shopPager').count(),0);
    async function inspectCatalog(){
      const cards=page.locator('.shopItem');
      for(let i=0;i<await cards.count();i++){
        const card=cards.nth(i),key=await card.getAttribute('data-item');
        await card.tap();
        await page.waitForFunction(()=>Array.from(document.querySelectorAll('.shopCatalog img')).every(img=>img.complete&&img.naturalWidth>0));
        assert.equal(await page.locator('.shopDescription').textContent(),E.ITEMS[key].description);
        assert.equal(await page.locator('.shopArt').getAttribute('src'),`assets/pc-shop/${E.ITEMS[key].originalId}.png`);
        await visibleWithoutScroll(page,await page.locator('.shopTransact').textContent());
        assert.equal(await card.getAttribute('aria-pressed'),'true');
      }
      const sizing=await page.locator('#modal').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight}));
      assert(sizing.scroll<=sizing.height+1,'catalog must not require scrolling to reach controls');
    }
    await inspectCatalog();
    await page.screenshot({path:`test-results/rc20-shop-touch/catalog-${viewport.width}x${viewport.height}.png`});
    await page.getByRole('button',{name:'返回商店',exact:true}).tap();
    await page.getByRole('button',{name:'购买道具',exact:true}).tap();
    await page.getByRole('button',{name:'查看 护身符',exact:true}).tap();
    await page.getByRole('button',{name:'购买 护身符 · 80 豆沙包',exact:true}).tap();
    assert.equal((await snapshot(page)).players[0].cash,1120);
    await page.getByRole('button',{name:'购买 护身符 · 80 豆沙包',exact:true}).tap();
    const after=await snapshot(page);assert.equal(after.players[0].cash,1040);assert.deepEqual(after.players[0].inventory,['charm','charm']);
    await page.getByRole('button',{name:'返回商店',exact:true}).tap();
    await page.getByRole('button',{name:'保存并返回主菜单',exact:true}).tap();await page.reload();await resume(page);
    assert.deepEqual(await snapshot(page),after);
    await page.getByRole('button',{name:'卖出道具',exact:true}).tap();
    assert.equal(await page.getByRole('button',{name:/^卖出 空气枪/}).count(),0);
    await visibleWithoutScroll(page,'离开商店');await page.getByRole('button',{name:'离开商店',exact:true}).tap();
    await page.waitForFunction(()=>window.__game.snapshot().game.turn===1);
    checks.push(`${viewport.width}x${viewport.height}: every original item image decodes, matching effect descriptions, explicit selection and buy/sell, no modal scrolling, duplicate items, original prices, scrolling catalog and consecutive purchases, exact reload and turn completion`);
    await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('test-results/rc20-shop-touch/result.json',JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify({checks,errors},null,2));await browser.close();
})().catch(async error=>{console.error(error);if(browser)await browser.close();process.exitCode=1;});
