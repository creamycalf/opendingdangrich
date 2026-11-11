import {loadImageSources} from './image-loader.mjs';
export function createSpriteLoader(index){
 const sheets={};
 return async function load(sources,target,cache={}){
  const missing=sources.filter(([key])=>!cache[key]);
  const urls=[...new Set(missing.map(([,url])=>index[url]?.url??url))];
  const decoded={};
  await loadImageSources(urls.map(url=>[url,url]),decoded,sheets);
  for(const [key,url] of sources){
   if(cache[key]){target[key]=cache[key];continue;}
   const a=index[url];
   if(a){
    // Each map owns its decoded terrain. The last reference is dropped when
    // commitMap replaces the old board; only common actor/item sheets persist.
    if(!a.url.startsWith('assets/sprite-atlas/map-'))sheets[a.url]=decoded[a.url];
    target[key]={image:decoded[a.url],...a};
   }
   else target[key]=decoded[url];
  }
 };
}
export function drawSprite(ctx,im,x,y){
 if(im.image)ctx.drawImage(im.image,im.x,im.y,im.w,im.h,x,y,im.w,im.h);
 else ctx.drawImage(im,x,y);
}
