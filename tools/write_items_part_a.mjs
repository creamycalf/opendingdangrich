import fs from 'node:fs';import {ITEMS} from '../app/src/inventory.mjs';
const detail=[
 ['降低身旁建筑一级；特殊炮台/导弹等级1降至地基0，保留地主，立即结束行动','邻格第一块已购且level>0土地，允许自己的土地','时间布会清归属；复原不退款','0x491253；0x490ccc','land-items、v126-items-a','无产品修改：原level>0门限正确；补特殊建筑真实使用命令6组合'],
 ['5天免租','自己','免租掩码0xffffffdf；互斥按新版完整表','0x491448；0x4915cf','v126-item-common、effects','未发现本范围差异'],
 ['清除邻地建筑和归属，立即生效','其他玩家已购邻地；自己的地拒绝','包含炮台/导弹，不返还原主钱款','0x491d4d；0x491953','land-items、v126-items-a','补特殊建筑清除的存档回放测试'],
 ['成对磁铁5天、排斥走向','指定可攻击对手，不能重复配对','普通攻击资格与相机转移；能力值0x400000','0x491f17；0x492184；0x4922be','clones-magnet、v126-item-common','以新版原生构造确认mask/value'],
 ['对手昏睡3天','可攻击对手；大雄不能攻击静香','共用目标资格、冲突表及相机；无需命中概率','0x4923ed；0x4929b4','target-items、v126-item-common','未发现本范围差异'],
 ['本月提前结算，标记已领取；日期不变','自己；0x80月结已领标记拒绝重用','清冲突效果；正常月结跳过已领的地产/步行奖励','0x492bcd；0x492dcf','economic-items、monthly','复核新版使用门限；完整月结内部数值另有公共证据'],
 ['道路隧道持续5天，按方向缩小/恢复','空闲普通道路，按轴向入口筛选','与大小、头带、分身、机械活动体互动；方向片段已另行新版机器执行','0x492ff8；0x493971；0x4934a3','tunnel、pc-navigation','未发现已核查方向/门限差异'],
 ['相机记录目标，遇可转移攻击使用；10作为不递减哨兵','一名可攻击对手','只转移一次、无效目标保留；军队直接效果不走普通目标链','0x49419a；0x4945b3；0x4946d8','target-items、v126-item-common','新版构造duration10、mask和值与共同机制核对'],
 ['5天待命；支付普通地租后直接令地主睡5天并消耗','实际地主','地主已睡/机械活动体时保留；反向租金不触发','0x494bd0；0x443bb1（已有新PC租金证据）','target-items、special-buildings、effects','未发现已核查报复链差异'],
 ['5天租金方向反转','自己；停靠普通地产时生效','租金免除、地主不能收租优先；军队不因反向租金发动','0x495267；0x495279；0x443bb1','economic-items、v126-item-common','新版value0x40000及租金负号分支确认'],
 ['5天免租与免攻击','自己','mask0xfffffbdf；新版互斥表决定与机器人小姐/人见人爱替换','0x4953b7；0x4953c9','effects、v126-item-common','未发现本范围差异'],
 ['8天免付租且本人地产不能收租','自己','mask0xffffffdb；与攻击/效果替换按新版表','0x495941；0x495953；0x495a3d','effects、v126-item-common','未发现本范围差异'],
 ['8天随机好运/恶运；新PC749/1000好运、251/1000恶运','自己','好运值0x24000、恶运0x18000，影响租金和仙人；旧存档保持旧阈值','0x495b30；0x495e9e cmp eax,250 / jle；0x49619f','v126-items-a：1000机器样本+100条命令/存档/回放','修复新版仍使用旧版>=751阈值，改>=251；说明同步'],
 ['把本人发射到目标道路；保留合法旧朝向否则抽方向；结束行动','空闲普通道路，排除特殊区域/占用','不把其他玩家当目标；传送后跟随者重定位','0x4962a6；0x496423；0x496d10','road-items、clones-magnet','未发现已核查目标门限差异']
];
const rows=detail.map((d,id)=>({id,name:Object.values(ITEMS).find(i=>i.originalId===id).name,effectAndTiming:d[0],target:d[1],interaction:d[2],newPcEvidence:{addresses:d[3],files:['docs/audits/items-2026-11-07-part-a-native.json','research/v126-items-a-handlers.json','research/v126-items-a-gates.json','research/v126-items-a-rules.json',...(id===0?['research/v126-restore-impact.json']:[]),...(id===12?['research/v126-lucky-shot-assembly.json']:[])],common:'tests/fixtures/v126-item-common.json: native constructors,7744 pair/source/mode conflicts and target cases'},tests:d[4],changes:d[5],remainingScope:'未逐帧核对图像/音频；未对任意多状态叠加与所有地图全流程作穷尽证明。已核对的是所列原生入口、构造/共同规则和指定回归；不是全组合一致性承诺。',fullPcEquivalence:false}));
fs.writeFileSync('docs/audits/items-2026-11-07-part-a.json',JSON.stringify({sourceSha256:'b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1',provider:'REA/Ghidra 12.1.4 plus Unicorn isolated native instructions; allocation/free/debug explicitly substituted in constructor oracle',status:'14 items audited at documented scope; confirmed lucky-shot defect fixed',rows,tests:{command:'node --test tests/v126-items-a.test.mjs tests/land-items.test.mjs tests/economic-items.test.mjs tests/target-items.test.mjs tests/road-items.test.mjs tests/tunnel.test.mjs tests/v126-item-common.test.mjs',passed:33}},null,2));
