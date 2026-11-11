// Human shop handler: purchase 0x4a45c3..4a45fb, sale 0x4a4945..4a4977.
// Base purchase price zero means absent from the shop, not free.
export function originalShopPrice(shop,item,kind,multiplier=1,purchasePercent=100){
  if(!shop||!Array.isArray(shop.rawParameters)||shop.rawParameters.length!==84)throw Error('商店数据缺失');
  if(!Number.isInteger(item)||item<0||item>=42||!['buy','sell'].includes(kind))throw Error('道具价格请求无效');
  if(!Number.isFinite(multiplier)||multiplier<=0||!Number.isFinite(purchasePercent)||purchasePercent<=0)throw Error('商店倍率无效');
  const base=shop.rawParameters[item+(kind==='sell'?42:0)];
  if(!Number.isInteger(base)||base<0||base>0xffffffff)throw Error('道具价格损坏');
  return Math.fround(base*Math.fround(multiplier)*(kind==='buy'?Math.fround(purchasePercent)/100:1));
}
export function mapShop(map,lot){
  const cell=map.cells[lot];
  if(cell?.event!==5)throw Error('这里没有商店');
  const record=map.shops?.find(s=>s.x===cell.x&&s.y===cell.y);
  if(!record)throw Error('商店数据缺失');
  return record;
}
