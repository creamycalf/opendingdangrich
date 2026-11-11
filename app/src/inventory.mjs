import {ORIGINAL_ITEMS} from './item-catalog.mjs';

// EXE table 0x4c3c64; both normal-game constructors draw 22 unique entries.
export const STARTING_ITEM_POOL=Object.freeze([0,1,3,4,6,9,11,12,14,16,17,19,22,25,26,27,28,30,31,32,34,36,37,38,41]);
const knownKeys={0:'restoreRay',2:'timeCloth',28:'charm',36:'air',37:'door'};
export const itemKey=id=>knownKeys[id]??`original-${id}`;
// 0x439fcd: virtual month-start callback only on day 1, intra-day cycle 0.
// 0x451d2f and 0x452621 increment these original inventory slots.
export function originalMonthlyGiftIds(character,day,cycle=0){
  if(day!==1||cycle!==0)return [];
  return character==='nobita'?[36]:character==='shizuka'?[10,19]:[];
}
const available={
  'original-24':{name:'分身药水',description:'变出三个跟随自己的分身，持续五天。每个分身停靠的位置分别结算事件和地产；分身也会占用道路位置。身后需要有可用道路。'},
  'original-32':{name:'一分为二刀',description:'变出一个跟随自己的分身，持续五天。分身停靠的位置也会结算事件和地产。不能与分身药水同时生效。'},
  'original-3':{name:'南北极徽章',description:'选一名对手，与自己配成一对，双方戴上同样的徽章，持续五天。任何一方走向另一方所在的道路格时，会受排斥而转身，不能直接走到对方所在格。只影响这一对角色，不会排斥所有人。已经戴徽章的对手不能再选；对方的咒语相机可能把配对转给照片中的角色。'},
  'original-6':{name:'缩形隧道',description:'在绿色道路上放置五天的缩形隧道。由大口穿过会缩小五天、步幅减半；缩小后从相反方向穿过可恢复。侧面不能进入，携带分身或怨恨头带时不能穿过。'},
  'original-40':{name:'无敌炮台',description:'在身旁自己的空地基上建造炮台。对手停靠时自动将其送往倒霉区域；正在代替主人行动的机械小矮人可避开炮台。设施可以反复使用。'},
  'original-41':{name:'自制导弹',description:'在身旁自己的空地基上建造导弹。自己再次停靠时选择一名可攻击的对手，送其进入倒霉区域。咒语相机可以转移导弹，设施可以反复使用。'},
  'original-21':{name:'搬迁地图',description:'在地图上依次选择两座普通建筑，将它们的归属和等级交换位置。不能选择空地或特殊建筑；土地本身的地价保持不变。'},
  'original-35':{name:'怨恨头带',description:'让幽灵跟随一名未缩小的对手八天，期间该角色支付双倍租金，并遇到坏仙人事件。咒语相机可以转移这个攻击。'},
  'original-8':{name:'玩具军队',description:'五天内支付正常地租后，军队攻击该土地的地主，使其昏睡五天，然后消耗。地主已经在睡眠中时保留军队；颠倒笔支付的反向租金不会触发。'},
  'original-14':{name:'机械小矮人',description:'在身上待命直到睡眠发生。睡着后由小矮人代替行动，可买地和升级，期间不能使用道具、进入商店或小游戏；醒来后小矮人消失，回到沉睡本体所在的位置。不能与竹蜻蜓同时生效。'},
  'original-7':{name:'咒语相机',description:'先拍摄一名对手。此后受到可反射的攻击时，将攻击转给照片中的角色并消耗相机；若该角色无法承受此攻击，相机保留。交换布、处境掉换枪和朋友圈不受反射影响。'},
  'original-17':{name:'恶运钻石',description:'选择一名对手。八天内第一次遇到可转移的单人坏仙人事件时，将事件传给该角色，钻石随即消耗。对方不符合事件条件时，坏事件仍由自己承受。'},
  'original-26':{name:'睡意枪',description:'先选一名有睡意的对手，再选另一名可攻击的对手。前者醒来，后者昏睡五天；接收者的咒语相机可以转移效果。大雄可以吸走静香的睡意，但不能把睡意交给她。'},
  'original-38':{name:'竹蜻蜓',description:'五天内飞离地面，免交地租，不触发地面事件，不累计步行奖励。期间不能买地、升级、进入道具商店或拾取铃铛。不能与机械小矮人同时生效。'},
  'original-39':{name:'缩小电筒',description:'将一名未缩小的对手缩小五天，每点骰子只移动半格；期间不能使用道具、进入道具商店或小游戏。到期恢复大小，半格位置会保留。'},
  'original-12':{name:'幸运枪',description:'给自己随机带来八天好运或恶运。约75%获得好运：收取双倍租金，仙人赐予好事件；约25%遭遇恶运：支付双倍租金，遇到坏仙人事件。'},
  'original-34':{name:'倒霉咪表',description:'八天内遇到坏仙人事件时获得该事件规定的豆沙包补偿，补偿随物价变化。坏事件本身仍会发生。'},
  'original-9':{name:'颠倒笔',description:'五天内停靠其他玩家地产时，租金方向颠倒，由原收款方支付豆沙包给你。双方的免租、不能收租状态仍有效；欠款由实际付款者处理。'},
  'original-33':{name:'处境掉换枪',description:'与指定对手交换位置、朝向、手持豆沙包、矿山存款、累计利息、步行点数、道具库存和地产。角色身份与持续状态不随财产交换，但会清除目标的怨恨头带。'},
  'original-5':{name:'日期转换仪',description:'立即领取本人的月结豆沙包，日期不变。地产奖励和累计步行点数提前结算，每月仅能使用一次；当月正常月结不再发放这两项奖励。'},
  'original-15':{name:'狸猫套装',description:'使指定对手产生错觉五天，其停靠普通地产时将租金交给你，连其自己的地产也会缴租。免租和地产不能收租的状态仍然有效。'},
  'original-16':{name:'疯狂时间器',description:'全体玩家行动两轮才过一天，持续五个游戏日。期间不能再次使用疯狂时间器；道路道具仍按日期计时。'},
  'original-27':{name:'朋友圈',description:'与指定对手建立五天的友情，使对方不能以你为目标使用攻击道具。对方仍可攻击其他角色，租金照常计算。'},
  'original-4':{name:'传染伤风纸电话',description:'把伤风传染给指定对手，使其昏睡三天。对手须能成为攻击目标；无需空气枪的命中判定。'},
  'original-25':{name:'失忆棒',description:'使指定对手失忆五天，期间其地产不能收取租金。对手仍会照常支付其他费用。'},
  'original-30':{name:'交换布',description:'与指定对手交换位置和朝向。交换后结束本次行动；财产和持续状态不随位置交换，但会清除目标的玩具军队。'},
  'original-1':{name:'机器人小姐',description:'为期五天，停靠对手地产免交租。其他费用照常支付。持续时间在自己的正常回合开始时更新。'},
  'original-10':{name:'友情药袋',description:'为期五天，停靠对手地产免交租，也不能被选为攻击目标。会替换机器人小姐、人见人爱丸的状态。'},
  'original-19':{name:'人见人爱丸',description:'为期五天，不能被选为攻击目标。会替换友情药袋，替换后不再享有药袋的免租效果。'},
  'original-11':{name:'石头帽',description:'生效八天，免交租，但自己的地产也不能收租。'},
  'original-18':{name:'隐形眼药水',description:'生效五天，停靠对手地产免交租。'},
  'original-20':{name:'储钱蜜蜂',description:'生效五天，保护手持豆沙包，不受征罚圈罚款影响。'},
  'original-22':{name:'蜗牛屋',description:'生效五天，不受仙人圈事件影响。'},
  'original-23':{name:'灵魂守卫',description:'生效五天，免租、免受攻击、仙人事件和征罚圈罚款影响；期间不能进入商店。'},
  'original-29':{name:'盲点星星',description:'生效八天，免交租，但自己的地产也不能收租。'},
  'original-31':{name:'失物回归机器',description:'生效五天，保护手持豆沙包，不受征罚圈罚款影响。'},
  restoreRay:{name:'复原光线',description:'把身旁建筑降低一级，土地仍归原主人，也可用于自己的建筑。炮台或导弹会被拆除，留下原主人的空地基；没有建筑的土地不能使用。'},
  timeCloth:{name:'时间布',description:'把身旁其他玩家的土地恢复成可购买的空地，清除建筑和归属。不能用于自己的土地。'},
  door:{name:'任意门',description:'在没有角色、道具占用的普通道路放置一扇门，持续五天。沿门的通行方向穿过时，随机传送到另一处道路并继续前进。门的侧面不能穿过。'},
  'original-13':{name:'可到任何地方大炮',description:'选择一处没有角色或道具占用的普通道路，把自己传送过去。特殊区域不能选择；使用后结束本次行动。'},
  air:{name:'空气枪',description:'命中后使对手昏睡三天。大雄必中，其他角色命中率为 30%。对方行动前更新持续时间，到期醒来；未命中也会消耗道具和本次行动。'},
  charm:{name:'护身符',description:'生效五天，期间仙人宝箱保证好运，开箱不会消耗护身符。剩余时间在自己的正常回合开始时更新。'},
};
/** @type {Record<string,{originalId:number,name:string,description:string,originalDescription:string,implemented:boolean}>} */
export const ITEMS=Object.fromEntries(ORIGINAL_ITEMS.map(item=>{
  const key=itemKey(item.id),implemented=Object.hasOwn(available,key);
  return [key,{originalId:item.id,name:item.name,originalDescription:item.description,
    description:'原作说明：\n'+item.description+'\n\n此道具效果尚未还原，暂不能使用；库存会保留。',
    implemented,...available[key]}];
}));

// draw(n) is injected: match original sampling/duplicate consumption, without
// claiming that this engine's seeded PRNG matches the original Windows RNG.
export function startingInventory(character,draw){
  if(character==='yellow')return Array.from({length:42},(_,id)=>itemKey(id));
  if(character!=='doraemon'&&character!=='dorami')return [];
  const ids=new Set();
  while(ids.size<22){
    const index=draw(25);
    if(!Number.isInteger(index)||index<0||index>=25)throw Error('道具抽取结果无效');
    ids.add(STARTING_ITEM_POOL[index]);
  }
  // Original inventory is a 42-slot count array, traversed by item ID.
  return [...ids].sort((a,b)=>a-b).map(itemKey);
}
