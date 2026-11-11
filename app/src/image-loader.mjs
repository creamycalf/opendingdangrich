// Chromium/WebView can exhaust its outstanding request budget when thousands
// of original sprite files are assigned src at once. Keep a small worker pool.
export async function loadImageSources(sources,target,cache={},limit=16,create=()=>new Image()){
 const entries=[...new Map(sources).entries()];let next=0,failure;
 await Promise.all(Array.from({length:Math.min(limit,entries.length)},async()=>{
  while(!failure&&next<entries.length){
   const [key,url]=entries[next++];
   if(cache[key]){target[key]=cache[key];continue;}
   try{await new Promise((resolve,reject)=>{const im=create();im.onload=()=>{target[key]=im;resolve();};im.onerror=()=>reject(Error('资源加载失败：'+url));im.src=url;});}
   catch(error){failure=error;}
  }
 }));
 if(failure)throw failure;
}
