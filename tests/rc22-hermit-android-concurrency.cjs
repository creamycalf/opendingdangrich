const fs=require('node:fs'),{chromium}=require('../app/node_modules/playwright');let browser;
const bounded=p=>{let t;return Promise.race([p,new Promise((_,reject)=>t=setTimeout(()=>reject(Error('diagnostic timeout30s')),30000))]).finally(()=>clearTimeout(t));};
(async()=>{browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true,timeout:15000});const page=browser.contexts()[0].pages()[0];
const result=await bounded(page.evaluate(async()=>{
 const catalog=await (await fetch('assets/pc-hermit/catalog.json')).json(),urls=Object.values(catalog.images).map(x=>x.url);
 async function run(limit){const began=performance.now(),errors=[];let at=0;async function worker(){while(at<urls.length){const url=urls[at++],im=new Image();im.src=url;try{await im.decode();}catch(e){errors.push({url,w:im.naturalWidth,h:im.naturalHeight,error:e.message});}}}await Promise.all(Array.from({length:Math.min(limit,urls.length)},worker));return{limit,count:urls.length,ms:performance.now()-began,errors};}
 return [await run(420),await run(8),await run(420),await run(8)];
}));fs.writeFileSync('test-results/rc22-hermit-android-concurrency.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.map(r=>({...r,errors:r.errors.length}))));await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
