import fs from 'node:fs';
const native=JSON.parse(fs.readFileSync('research/items-b-native-match-20261107.json','utf8'));
const rows=[
 [14,'机械小矮人',['0x438bc6','0x438dc9','0x497242'],'睡眠时保存本体，创建代行体，醒来删代行体并恢复本体；待命计数99不递减。','effects.mjs:fallAsleep/wakePlayer；原Tools 113–120姿势；新PC与竹蜻蜓双向禁止并存由root公共表修正。','tests/clones-magnet.test.mjs'],
 [15,'狸猫套装',['0x4975e1','0x443bb1'],'攻击状态挂目标；先判行人免租和真实地主不能收租，再改收款人为套装施用者；使用收款人加倍能力，地产租金基值保留。','effects.mjs:rentRecipient；engine.mjs:chargeDestinationRent，含自己地产及分身。','tests/economic-items.test.mjs'],
 [16,'疯狂时间器',['0x497824','0x497961','0x4978cd'],'启动全局每日轮数2、剩余5天；状态寿命读全局剩余日数，非普通人物倒计时。','engine.mjs slowDays/dayCycle；本轮未重执行全局日历循环，沿用原日历机码夹具。','tests/economic-items.test.mjs'],
 [17,'恶运钻石',['0x497c5f'],'选定对手后挂施用者本人，持续8次时钟，保存转移目标。','engine.mjs REDIRECT_ITEMS；hermit.mjs消费与转移；旧原仙人细分夹具覆盖坏事件，当前新PC只核对激活挂载/期限，未宣称全部仙人子类新旧一致。','tests/target-items.test.mjs'],
 [18,'隐形眼药水',['0x497e43','0x48f524','0x443bb1'],'五天清除能力位0x20免租，激活时将角色可见性设为1。','effects.mjs免租已匹配；角色视觉透明度没有在此专项逐帧校验。','tests/protection.test.mjs'],
 [19,'人见人爱丸',['0x4980e9','0x48f524','0x48f317'],'五天清除0x400，被攻击选择回调拒绝。','effects.mjs:canBeAttacked，互斥由root新PC全表验证。','tests/protection.test.mjs'],
 [20,'储钱蜜蜂',['0x4984ca','0x498567','0x48f524'],'五天添加0x80000征罚保护；额外回调为表情/动画与台词，不是额外现金奖惩。','effects.mjs:protectedFromFine；此专项不声称原蜜蜂全部动画帧已复刻。','tests/protection.test.mjs'],
 [21,'搬迁地图',['0x498ea1','0x498f46'],'两处不同坐标，均需有主且kind1；交换16字节土地所有权记录和建筑记录坐标/外形；地价不随楼交换。','property-items.mjs仅owners/levels/kind；已核对主状态，原建筑外形字段另有视觉差异范围，未伪造字段。','tests/building-swap.test.mjs'],
 [22,'蜗牛屋',['0x499c30','0x48f524'],'五天清除0x800，免仙人事件。','effects.mjs:affectedByHermit；hermitCompatible检查0x800。','tests/protection.test.mjs'],
 [23,'灵魂守卫',['0x499ec6','0x48f524'],'五天清除0x40/0x20/0x400/0x800并添加0x80000，即禁商店、免租免攻击免仙人免征罚。','effects.mjs掩码与新PC490条样本一致；原8a–91动画循环仅取证不称逐帧一致。','tests/protection.test.mjs'],
 [24,'分身药水',['0x49ad26'],'建立3个跟随节点；优先背后道路，阻塞时按合法方向抽签；复制后仍需按各自实际停靠点结算。','clones.mjs、engine.mjs visitAt；原摆放机码4684例和独立买地/租金回归覆盖。','tests/pc-clone-arrival.test.mjs'],
 [25,'失忆棒',['0x49c2a1','0x48f524','0x443bb1'],'目标五天清除收租能力4；租金入口在收款人转移之前检查真实地主能力。','effects.mjs:canCollectRent；免收租与狸猫转移顺序已有回归。','tests/protection.test.mjs'],
 [26,'睡意枪',['0x49c8b4','0x49c999'],'来源阶段只需存活且睡眠或小矮人代行；接收阶段需不同来源、互斥/攻击可用并限制大雄攻击静香；唤醒来源后接收方睡五天。','已修canTakeSleep错误的大雄→静香来源限制；32条新PC原指令用例验证。说明同步。','tests/items-part-b.test.mjs'],
 [27,'朋友圈',['0x49d11e','0x48f317'],'五天攻击状态附着目标；攻击者身上朋友圈原施用者不可成为其攻击目标，单向保护，不改变租金。','effects.mjs:canAttackPlayer；通用新PC门限由root4680例验证。','tests/economic-items.test.mjs'],
];
const report={date:'2026-11-07',part:'b',sourceSha256:native.newSha256,oldEvidenceSha256:native.oldSha256,provider:'Ghidra 12.1.4 + Unicorn x86 32-bit + Capstone read-only PE',scope:'逐项核对激活/关键消费函数与实现；保留未覆盖的仙人子类、视觉/动画时间点边界，不用构造器或UI通过替代完整语义证明。',evidence:['research/items-b-native-match-20261107.json','research/items-b-critical-success-20261107.json','research/items-b-effects-20261107.json','research/items-b-activation-20261107.json','research/items-b-consumers-20261107.json','tests/fixtures/v126-item-common.json'],tests:{passed:32,command:'node --test tests/items-part-b.test.mjs tests/target-items.test.mjs tests/protection.test.mjs tests/economic-items.test.mjs tests/building-swap.test.mjs tests/clones-magnet.test.mjs tests/pc-clone-arrival.test.mjs',newNativeMaskCases:490,newNativeSleepCases:32},items:rows.map(([id,name,addresses,observed,comparison,test])=>({id,name,addresses,observed,comparison,test,status:id===26?'confirmed_difference_fixed':id===14?'confirmed_common_table_difference_fixed_by_root':'scoped_semantics_checked',constructor:native.newFactoryExecution.find(r=>r.id===id)}))};
report.rows=report.items.map(r=>({id:r.id,name:r.name,effectAndTiming:r.observed,target:r.id===26?'来源活着且睡眠/小矮人；接收者攻击合法且非来源':[15,25,27].includes(r.id)?'合法攻击目标':r.id===17?'选择攻击目标，状态挂施用者':r.id===21?'两处不同有主kind1建筑':'自身',interaction:r.comparison,newPcEvidence:{addresses:r.addresses,files:report.evidence.slice(0,5)},tests:[r.test,'tests/items-part-b.test.mjs'],changes:r.id===26?'修复来源阶段错误角色限制并更新说明':r.id===14?'root修新PC竹蜻蜓互斥表':'无需修改核心规则',remainingScope:r.id===17?'本轮未逐一执行全部仙人子类重定向路径；已有旧PC夹具与新激活依据，不能宣称全子类一致':'原完整动画时间点/语音/视觉未逐帧对照；规则覆盖以对应函数和测试范围为准',fullPcEquivalence:false}));
fs.mkdirSync('docs/audits',{recursive:true});fs.writeFileSync('docs/audits/items-2026-11-07-part-b.json',JSON.stringify(report,null,2));

