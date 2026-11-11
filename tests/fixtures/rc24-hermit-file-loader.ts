import {animationFrame} from './character-animation.mjs';
import {HERMIT_TICK_MS,hermitSounds,hermitChoiceFrame,hermitResultFrame} from './hermit-presentation.mjs';
import './hermit-view.css';
type Assets={catalog:any;images:Record<number,HTMLImageElement>};
let assets:Promise<Assets>|undefined;
async function loadBitmap(url:string){
 const image=new Image();
 // Android WebView can reject decode() while a newly assigned URL is still
 // loading even though the PNG and decoded pixels are valid. Wait for onload
 // before requesting decode; verified on the formerly failing 44 original PNGs.
 await new Promise<void>((resolve,reject)=>{
  const timer=setTimeout(()=>finish(Error('原图加载超时：'+url)),15000);
  function finish(error?:Error){clearTimeout(timer);image.onload=null;image.onerror=null;error?reject(error):resolve();}
  image.onload=()=>finish();image.onerror=()=>finish(Error('原图加载失败：'+url));image.src=url;
 });
 try{await image.decode();}catch{throw Error('原图解码失败：'+url);}
 return image;
}
function load(){return assets??=fetch('assets/pc-hermit/catalog.json').then(async r=>{
 if(!r.ok)throw Error('仙人宝箱资源加载失败');const catalog=await r.json(),images:Record<number,HTMLImageElement>={};
 const jobs:{id:number;url:string}[]=Object.entries(catalog.images).map(([id,meta]:[string,any])=>({id:Number(id),url:meta.url}));
 for(const e of Object.values(catalog.events??{}) as any[])if(e.icon)jobs.push({id:10000+e.icon.id,url:e.icon.url});
 let at=0;await Promise.all(Array.from({length:Math.min(16,jobs.length)},async()=>{while(at<jobs.length){const job=jobs[at++];images[job.id]=await loadBitmap(job.url);}}));return {catalog,images};
}).catch(e=>{assets=undefined;throw e;});}
export const loadHermitAssets=load;
