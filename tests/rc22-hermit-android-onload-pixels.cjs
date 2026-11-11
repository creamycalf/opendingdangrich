const fs=require('node:fs'),{chromium}=require('../app/node_modules/playwright');let browser;
const bounded=p=>{let t;return Promise.race([p,new Promise((_,reject)=>t=setTimeout(()=>reject(Error('diagnostic timeout15s')),15000))]).finally(()=>clearTimeout(t));};
(async()=>{browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{noDefaults:true,timeout:15000});const page=browser.contexts()[0].pages()[0];
const ids=[...new Set(JSON.parse(fs.readFileSync('test-results/rc22-hermit-production-android/failure-diagnostic.json')).imageErrors.map(x=>Number(x.src.match(/(\d+)\.png/)[1])))];const result=await bounded(page.evaluate(async ids=>{
 const out=[];for(const id of ids){
  const url='assets/pc-hermit/'+id+'.png';
  const im=new Image(),loaded=new Promise(resolve=>{im.onload=()=>resolve('load');im.onerror=()=>resolve('error');});im.src=url;const onload=await loaded;let decode;try{await im.decode();decode='ok';}catch(e){decode=e.message;}const r=await fetch(url),data=await r.arrayBuffer(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');const canvas=document.createElement('canvas');canvas.width=im.naturalWidth||48;canvas.height=im.naturalHeight||48;let draw;try{const ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;draw={alpha:Array.from(rgba).filter((v,i)=>i%4===3&&v).length,rgbaSha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',rgba))).map(x=>x.toString(16).padStart(2,'0')).join('')};}catch(e){draw={error:e.message};}
  out.push({id,status:r.status,type:r.headers.get('content-type'),bytes:data.byteLength,sha256:digest,decode,onload,w:im.naturalWidth,h:im.naturalHeight,draw});
 }return out;
},ids));fs.writeFileSync('test-results/rc22-hermit-android-onload-pixels.json',JSON.stringify(result,null,2));console.log({count:result.length,decoded:result.filter(x=>x.decode==='ok').length});await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
