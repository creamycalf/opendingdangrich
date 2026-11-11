import {loadImages} from './scene-image-loader';
type Options={manifestUrl:string;signal?:AbortSignal;concurrency?:number;onFallback?:(reason:Error)=>void;fetchTimeoutMs?:number};
/** Only transport/manifest failures fall back. Decode failures remain actionable. */
export async function loadBundledImages(urls:string[],options:Options):Promise<HTMLImageElement[]>{
 let bytes:ArrayBuffer,entries:Record<string,{offset:number;length:number}>;
 const transport=new AbortController(),cancel=()=>transport.abort();let timedOut=false;
 options.signal?.addEventListener('abort',cancel,{once:true});if(options.signal?.aborted)cancel();
 const timer=setTimeout(()=>{timedOut=true;transport.abort();},options.fetchTimeoutMs??20000);
 try{
  const response=await fetch(options.manifestUrl,{signal:transport.signal});if(!response.ok)throw Error('原图包清单HTTP '+response.status);
  const manifest=await response.json();if(manifest.version!==1||!manifest.entries||typeof manifest.bundle!=='string')throw Error('原图包清单无效');
  const base=new URL(options.manifestUrl,document.baseURI),bundleUrl=new URL(manifest.bundle,base);if(bundleUrl.origin!==base.origin)throw Error('原图包来源不一致');
  const packed=await fetch(bundleUrl,{signal:transport.signal});if(!packed.ok)throw Error('原图包HTTP '+packed.status);bytes=await packed.arrayBuffer();
  if(bytes.byteLength!==manifest.length)throw Error('原图包长度不符');entries=manifest.entries;
  for(const url of urls){const e=entries[url];if(!e||!Number.isSafeInteger(e.offset)||!Number.isSafeInteger(e.length)||e.offset<0||e.length<8||e.offset+e.length>bytes.byteLength)throw Error('原图包索引无效：'+url);}
 }catch(error){if(options.signal?.aborted||(!timedOut&&(error as Error).name==='AbortError'))throw error;const reason=timedOut?new Error('原图包传输超时'):error instanceof Error?error:new Error(String(error));console.warn('原图包不可用，回退原PNG',reason.message);options.onFallback?.(reason);return loadImages(urls,options);}
 finally{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);}
 if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
 // Data URLs stay inside the renderer; Blob URLs require per-image registry/IPC.
 // Encode in bounded chunks so large PNGs cannot exceed the argument stack limit.
 const sources=urls.map(url=>{const e=entries[url],png=new Uint8Array(bytes,e.offset,e.length);let binary='';
  for(let at=0;at<png.length;at+=8192)binary+=String.fromCharCode(...png.subarray(at,at+8192));
  return 'data:image/png;base64,'+btoa(binary);
 });
 try{return await loadImages(sources,options);}
 finally{sources.length=0;}
}
