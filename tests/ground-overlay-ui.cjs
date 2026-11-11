const {chromium}=require('../app/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const old=process.env.EXPECT_OLD==='1',revision=old?'rc20':'rc21';
(async()=>{
 const E=await import('../app/src/engine.mjs'),atlas=JSON.parse(fs.readFileSync('app/public/assets/sprite-atlas/index.json'));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),checks=[];
 try{
  for(const id of [4,5,0]){
   const map=JSON.parse(fs.readFileSync(`app/public/assets/maps-v126/${id}.json`));
   const game=E.createGame(map,{startDate:'2000-04-03',players:['doraemon','nobita','shizuka','gian'].map(character=>({character,control:'human'}))});
   const lot=id===4?825:id===5?map.cells.findIndex((c,i)=>c.event===1&&c.x>10&&E.walkable(map.cells[i+map.width])):871,at=id===0?lot+1:lot+map.width;
   game.turn=3;game.players[3].at=at;game.players[3].direction=1;
   if(id!==0){game.owners[lot]=3;game.levels[lot]=0;game.kinds[lot]=0;}
   const page=await browser.newPage({viewport:{width:915,height:412},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   if(old)await page.route('**/*',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html',path='test-results/rc20-ground-baseline/'+name;if(fs.existsSync(path)&&fs.statSync(path).isFile())await route.fulfill({path});else await route.continue();});
   await page.addInitScript(g=>{
    localStorage.setItem('dingdang.touch.v2',JSON.stringify(g));performance.now=()=>1000;
    const draw=CanvasRenderingContext2D.prototype.drawImage,fill=CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect=function(...args){if(this.canvas.id==='board'&&args[0]===0&&args[1]===0)window.__boardDraws=[];return fill.apply(this,args);};
    CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(this.canvas.id==='board')(window.__boardDraws??=[]).push({url:im.src,args});return draw.call(this,im,...args);};
   },game);
   await page.goto(process.env.TEST_ORIGIN||'http://127.0.0.1:5291');await page.waitForFunction(()=>!!window.__game);await page.locator('#titleGate').tap();await page.getByRole('button',{name:'大富翁',exact:true}).tap();await page.locator('#continueGame').tap();await page.waitForFunction(()=>window.__game.snapshot().active&&!window.__game.snapshot().busy);
   await page.waitForTimeout(100);
   if(id!==0){
    const pixels=()=>page.evaluate(at=>{const c=document.getElementById('board'),r=c.getBoundingClientRect(),p=window.__game.cellScreen(at),z=window.__game.snapshot().camera.z,d=c.width/r.width;const x=Math.round((p.x-r.left-20*z)*d),y=Math.round((p.y-r.top-65*z)*d),w=Math.round(40*z*d),h=Math.round(60*z*d);return [...c.getContext('2d').getImageData(x,y,w,h).data];},at);
    const before=await pixels(),point=await page.evaluate(i=>window.__game.cellScreen(i),lot);
    await page.touchscreen.tap(point.x,point.y);await page.waitForTimeout(100);const after=await pixels();
    await page.screenshot({path:`test-results/${revision}-ground-overlay-map-${id}.png`});
    let orangePixels=0,overpainted=0;
    for(let n=0;n<before.length;n+=4)if(before[n]>140&&before[n+1]>45&&before[n+1]<150&&before[n+2]<55){orangePixels++;if(before.slice(n,n+4).some((v,j)=>v!==after[n+j]))overpainted++;}
    assert.ok(orangePixels>30);assert.ok(old?overpainted>0:overpainted===0,`${id}: ${overpainted} of ${orangePixels} orange body pixels overwritten by selection`);
    assert.equal(await page.evaluate(()=>window.__game.snapshot().selected),lot);await page.locator('#inspect').waitFor({state:'visible'});
    checks.push({map:id,lot,at,orangePixels,overpainted,selected:true});
   }else{
    const sprite=atlas['assets/maps/0/2-265.png'];
    const cell=map.cells[lot],expected={...sprite,dx:(cell.x-cell.y)*40-40,dy:(cell.x+cell.y)*20+20-sprite.h};
    const drawn=await page.evaluate(a=>window.__boardDraws.some(d=>d.url.endsWith(a.url)&&d.args[0]===a.x&&d.args[1]===a.y&&d.args[2]===a.w&&d.args[3]===a.h&&d.args[4]===a.dx&&d.args[5]===a.dy),expected);
    assert.equal(drawn,!old);checks.push({map:0,object:265,lot,shopSignDrawn:drawn});
   }
   assert.deepEqual(errors,[]);await page.screenshot({path:`test-results/${revision}-ground-overlay-map-${id}.png`});await page.close();
  }
  fs.writeFileSync(`test-results/${revision}-ground-overlay-ui.json`,JSON.stringify({passed:true,old,checks},null,2));console.log(checks);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
