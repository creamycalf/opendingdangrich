const {chromium}=require('../app/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
let browser;
(async()=>{
 const E=await import('../app/src/engine.mjs'),{itemKey}=await import('../app/src/inventory.mjs');
 const map=JSON.parse(fs.readFileSync('app/public/assets/maps-v126/4.json'));map.jail=JSON.parse(fs.readFileSync('app/public/assets/flow-assets.json')).jail;
 const out='test-results/rc20-inventory-touch',checks=[],errors=[],missing=[];fs.mkdirSync(out,{recursive:true});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 async function visible(page,b){
  assert(await b.isVisible(),'control visible');const r=await b.boundingBox(),v=page.viewportSize();
  assert(r.width>=40&&r.height>=40,'touch target >=40px');assert(r.x>=0&&r.y>=0&&r.x+r.width<=v.width+1&&r.y+r.height<=v.height+1,'control within viewport');
  assert(await b.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'control unobscured');
 }
 async function press(cdp,x,y,duration=900){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await new Promise(r=>setTimeout(r,duration));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 async function swipe(cdp,rect){
  const x=rect.x+rect.width*.5,start=rect.y+rect.height*.85,end=rect.y+rect.height*.15;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start}]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*i/8}]});await new Promise(r=>setTimeout(r,25));}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await new Promise(r=>setTimeout(r,150));
 }
 for(const viewport of [{width:320,height:640},{width:915,height:412}])for(const empty of [false,true]){
  const g=E.createGame(map,{seed:72,startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
  g.players[0].inventory=empty?[]:[...Array.from({length:42},(_,id)=>itemKey(id)),'original-41','original-41'];
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await context.addInitScript(game=>{localStorage.setItem('dingdang.touch.v2',JSON.stringify(game));},g);
  const page=await context.newPage(),cdp=await context.newCDPSession(page);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))missing.push(r.url());});
  await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5185');await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
  await page.locator('#items').tap();await page.locator('.shopCatalog').waitFor();
  const before=await page.evaluate(()=>window.__game.snapshot().game),back=page.getByRole('button',{name:'返回游戏',exact:true});await visible(page,back);
  if(empty){assert.equal(await page.locator('.shopItem').count(),0);assert.equal(await page.locator('#shopItemName').textContent(),'口袋空了');assert(await page.locator('.shopTransact').isHidden());}
  else{
   assert.equal(await page.locator('.shopItem').count(),42);assert.match(await page.locator('#modalContent').innerText(),/共 44 件/);
   await page.getByRole('button',{name:'查看 南北极徽章',exact:true}).tap();
   if(!process.env.SKIP_SOURCE_COPY)assert.equal(await page.locator('.shopDescription').textContent(),E.ITEMS['original-3'].description);
   await visible(page,page.locator('.shopTransact'));await visible(page,back);
   const rect=await page.locator('.shopDescription').boundingBox();await press(cdp,rect.x+rect.width/2,rect.y+Math.min(rect.height/2,25));
   assert.equal(await page.evaluate(()=>String(window.getSelection())), '','long touch must not select copyable text');
   if(!process.env.SKIP_SOURCE_COPY)assert.equal(await page.locator('.shopDescription').evaluate(el=>getComputedStyle(el).userSelect),'none');
   assert.deepEqual(await page.evaluate(()=>window.__game.snapshot().game),before,'inspect/long-press does not consume/duplicate items');
   const grid=page.locator('.shopItems'),box=await grid.boundingBox();let swipes=0;
   while(swipes<30){const done=await grid.evaluate(el=>el.scrollTop+el.clientHeight>=el.scrollHeight-2);if(done)break;await swipe(cdp,box);swipes++;}
   const scroll=await grid.evaluate(el=>({top:el.scrollTop,height:el.clientHeight,total:el.scrollHeight}));assert(scroll.top>0&&scroll.top+scroll.height>=scroll.total-3,'native touch swipes reach last item');
   const last=page.locator('.shopItem[data-item="original-41"]');await visible(page,last);await last.tap();
   assert.equal(await page.locator('#shopItemName').textContent(),E.ITEMS['original-41'].name);assert.match(await page.locator('.shopStatus').textContent(),/口袋中有 3 件/);assert.match(await last.textContent(),/持有 ×3/);
   if(!process.env.SKIP_SOURCE_COPY)assert.equal(await page.locator('.shopDescription').textContent(),E.ITEMS['original-41'].description);
   assert.equal(await page.locator('.shopArt').getAttribute('src'),'assets/pc-shop/41.png');await page.waitForFunction(()=>Array.from(document.querySelectorAll('.shopCatalog img')).every(i=>i.complete&&i.naturalWidth>0));await visible(page,page.locator('.shopTransact'));await visible(page,back);
   await page.screenshot({path:`${out}/last-${viewport.width}x${viewport.height}.png`});
   await page.locator('.shopTransact').tap();const pocket=page.getByRole('button',{name:'返回口袋',exact:true});await visible(page,pocket);await visible(page,page.getByRole('button',{name:'使用道具',exact:true}));assert.match(await page.locator('#modalContent').innerText(),/自制导弹/);await pocket.tap();await page.locator('.shopCatalog').waitFor();assert.equal(await page.locator('.shopItem').count(),42);await visible(page,back);
   if(!process.env.SKIP_SOURCE_COPY){assert.equal(await page.locator('#shopItemName').textContent(),E.ITEMS['original-41'].name);assert(Math.abs(await page.locator('.shopItems').evaluate(el=>el.scrollTop)-scroll.top)<=1,'return to pocket retains list position');}
   for(let id=0;id<42;id++){
    const key=itemKey(id),card=page.locator(`.shopItem[data-item="${key}"]`);await card.tap();
    assert.equal(await page.locator('#shopItemName').textContent(),E.ITEMS[key].name);
    if(!process.env.SKIP_SOURCE_COPY)assert.equal(await page.locator('.shopDescription').textContent(),E.ITEMS[key].description);
    assert.equal(await page.locator('.shopArt').getAttribute('src'),`assets/pc-shop/${id}.png`);
    assert.match(await card.textContent(),new RegExp('持有 ×'+(id===41?3:1)));
    await visible(page,page.locator('.shopTransact'));await visible(page,back);
   }
   checks.push({viewport,case:'full',swipes,scroll,total:44,unique:42,lastCount:3,allItemNamesCountsImages:42,longPress:'900ms CDP native touch; no selection; state unchanged'});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert(await page.locator('#modal').evaluate(el=>el.scrollHeight<=el.clientHeight+1),'no full-dialog scrolling to access footer');
  await page.screenshot({path:`${out}/${empty?'empty':'pocket'}-${viewport.width}x${viewport.height}.png`});await back.tap();assert(await page.locator('#modal').isHidden());assert.deepEqual(await page.evaluate(()=>window.__game.snapshot().game),before);await visible(page,page.locator('#items'));if(empty)checks.push({viewport,case:'empty',back:'returns to unchanged game'});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const result={checks,errors,missing,sourceDescriptionsCompared:!process.env.SKIP_SOURCE_COPY,scope:'Chrome touch emulation; actual touch swipes and long press dispatched through CDP; not Android clipboard/system menu validation'};fs.writeFileSync(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(async error=>{console.error(error);if(browser)await browser.close();process.exitCode=1;});
