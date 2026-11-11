import {chromium} from '../app/node_modules/playwright/index.mjs';
const b=await chromium.connectOverCDP('http://127.0.0.1:9332');
try{const p=b.contexts()[0].pages()[0],c=await p.context().newCDPSession(p);const touch=async(x,y)=>{await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 const [kind,a,z]=process.argv.slice(2);
 if(kind==='nav'){if(!(await p.locator('.doraNavGrid').isVisible())){const r=await p.locator('.doraNavToggle').boundingBox();await touch(r.x+r.width/2,r.y+r.height/2);await p.waitForTimeout(200);}const r=await p.locator(`button[data-action=${a}]`).boundingBox();await touch(r.x+r.width/2,r.y+r.height/2);}
 else{const r=await p.locator('canvas').boundingBox();await touch(r.x+Number(a)*r.width/640,r.y+Number(z)*r.height/480);}
 await p.waitForTimeout(1500);await p.screenshot({path:'test-results/vm-result-touch.png'});console.log(await p.evaluate(()=>({consumption:lastTapConsumptionMs,mini:workerMiniState})));
}finally{await b.close();}
