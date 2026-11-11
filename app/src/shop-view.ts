import './shop-view.css';

export type ShopEntry = {
  id:string; originalId:number; name:string; description:string;
  price:string; count:number; label:string; disabled?:boolean; run:()=>void;
};

/** Inspect first, then transact. Artwork and effect text stay together on phones. */
export function mountShopCatalog(content:HTMLElement, entries:ShopEntry[], mode:'buy'|'sell'|'use', back:()=>void, leave:()=>void, state:{selected?:string;scroll?:number}={}) {
  const shop=document.createElement('section');shop.className='shopCatalog';
  shop.setAttribute('aria-label',mode==='buy'?'购买道具目录':mode==='sell'?'卖出道具目录':'口袋道具目录');
  const listing=document.createElement('div');listing.className='shopListing';
  const grid=document.createElement('div');grid.className='shopItems';grid.setAttribute('aria-label','道具列表');
  const detail=document.createElement('section');detail.className='shopDetail';detail.setAttribute('aria-label','道具说明');
  const detailTop=document.createElement('div');detailTop.className='shopDetailTop';
  const art=document.createElement('img');art.className='shopArt';art.alt='';
  const heading=document.createElement('h3');heading.id='shopItemName';
  detail.setAttribute('aria-labelledby',heading.id);detailTop.append(art,heading);
  const description=document.createElement('p');description.className='shopDescription';description.tabIndex=0;
  const buy=document.createElement('button');buy.className='primary shopTransact';
  const status=document.createElement('span');status.className='shopStatus';
  const button=(label:string,run:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=run;return b;};
  let selected=Math.max(0,entries.findIndex(item=>item.id===state.selected));
  listing.append(grid);
  detail.append(detailTop,description,status,buy);shop.append(listing,detail);
  const footer=document.createElement('nav');footer.className='shopFooter';footer.setAttribute('aria-label','商店导航');
  if(mode==='use')footer.append(button('返回游戏',leave));else footer.append(button('返回商店',back),button('离开商店',leave));
  content.append(shop,footer);
  function select(index:number) {
    selected=index;const item=entries[index];
    art.src=`assets/pc-shop/${item.originalId}.png`;art.alt=item.name;
    heading.textContent=item.name;description.textContent=item.description;description.scrollTop=0;
    status.textContent=mode==='use'?`口袋中有 ${item.count} 件 · 查看用法后施放`:mode==='sell'?`口袋中有 ${item.count} 件 · 每次卖出一件`:item.disabled?'豆沙包不足，可先查看说明':'每次购买一件';
    buy.textContent=item.label;buy.disabled=!!item.disabled;buy.onclick=item.run;
    for(const card of Array.from(grid.querySelectorAll<HTMLButtonElement>('button')))card.setAttribute('aria-pressed',String(Number(card.dataset.index)===selected));
  }
  function render() {
    grid.replaceChildren();
    entries.forEach((item,index)=>{
      const card=button('',()=>select(index));card.className='shopItem';card.dataset.index=String(index);card.dataset.item=item.id;
      card.setAttribute('aria-label',`查看 ${item.name}`);
      const image=document.createElement('img');image.src=`assets/pc-shop/${item.originalId}.png`;image.alt='';
      const name=document.createElement('span');name.textContent=item.name;
      const price=document.createElement('small');price.textContent=mode==='use'?`持有 ×${item.count}`:`${item.price} 豆沙包 · 持有 ${item.count}`;
      card.append(image,name,price);grid.append(card);
    });
    if(entries.length)select(selected);else{heading.textContent='口袋空了';art.hidden=true;buy.hidden=true;}
    grid.scrollTop=state.scroll??0;
  }
  render();
}
