type Options={signal?:AbortSignal;concurrency?:number;timeoutMs?:number};
const aborted=()=>new DOMException('Aborted','AbortError');
/** WebView requires load completion before decode; the deadline covers both. */
export function loadImage(url:string,{signal,timeoutMs=20000}:Options={}):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(aborted());return;}
  const image=new Image();let settled=false;const label=url.startsWith('data:')?'内存PNG（'+url.length+'字符）':url;
  const finish=(error?:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=null;image.onerror=null;signal?.removeEventListener('abort',cancel);if(error){image.removeAttribute('src');reject(error);}else resolve(image);};
  const cancel=()=>finish(aborted());
  const timer=setTimeout(()=>finish(Error('原图加载超时：'+label)),timeoutMs);
  signal?.addEventListener('abort',cancel,{once:true});
  image.onerror=()=>finish(Error('原图加载失败：'+label));
  image.onload=()=>{if(settled)return;Promise.resolve().then(()=>image.decode()).then(()=>finish(),()=>finish(Error('原图解码失败：'+label)));};
  image.src=url;
 });
}
/** Preserve input order while limiting network/decode pressure and cancel siblings on error. */
export async function loadImages(urls:string[],options:Options={}):Promise<HTMLImageElement[]>{
 if(options.signal?.aborted)throw aborted();
 const controller=new AbortController(),cancel=()=>controller.abort();options.signal?.addEventListener('abort',cancel,{once:true});
 const images:HTMLImageElement[]=new Array(urls.length);let next=0,failure:unknown;
 const count=Math.max(1,Math.min(16,Math.floor(options.concurrency??4)));
 try{await Promise.all(Array.from({length:Math.min(count,urls.length)},async()=>{while(next<urls.length){if(controller.signal.aborted)throw failure??aborted();const i=next++;try{images[i]=await loadImage(urls[i],{...options,signal:controller.signal});}catch(e){failure??=e;controller.abort();throw failure;}}}));if(options.signal?.aborted)throw aborted();return images;}
 finally{options.signal?.removeEventListener('abort',cancel);}
}
