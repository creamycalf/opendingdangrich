# 最新交付：RC24 场景加载与小矮人接管（2026-11-10）

APK releases/1.0.0-rc24/DingdangTouch-1.0.0-rc24.apk，code55，238209594 bytes，SHA256 3332806a37dbf001c6f975ed819e707554ae00f9a1f76b946cff7002f68f99e9，同RC23签名。22201打包资源逐字节验证，无devserver。tools/archive_feedback_rc24.py归档；tools/compare_rc24_loads.py生成性能对照。VM仍RC11。

胜利静态预载按seat/character/grade精简，199→155张，168组合覆盖。scene-image-loader.ts上限16，胜利开场16，其余结局4，仙人16。单并发调整中间包c405...曾16.24秒，不能宣称提速；Blob包fd535...仍9.74秒。最终scene-image-bundle.ts一次manifest+bin请求，原PNG byte slice分块base64内嵌图地址后onload→decode，避开数百ObjectURL登记/读取。零ObjectURL，无需revoke；传输20秒限制，用户abort不回退，传输/清单错误有日志并原PNG回退，decode错误不吞。QA日志短标签不存大段图片数据。原PNG保留，tools/build_scene_image_bundles.py生成victory340+hermit436图片包，776字节hash及436逐像素等价、取消/失败/恢复回归通过。

小矮人原证据438bc6→48ee44参数2→状态50→48f210→49709c，Tools121–124为已有机械小矮人首次接管睡眠身体动作；item-lifecycle-presentation.mjs接60帧/SFX7，睡姿ghost与替换actor控制，不改engine。17项相关回归，浏览器实际触摸draw31原sprite，最终Android draw30、结束可操作、native/web持久化一致、reload不重播。证据research/rc24-dwarf与RC24-DWARF-ACTIVATION.md；原作复制跟随者坐标而现engine保留p.at的差异仍需进一步核对，未借动画修复改规则。

最终dataURI生产浏览器报告rc24-datauri-ending-production（5组含完整片尾）、rc24-datauri-hermit-production（三尺寸）；原生rc24-ending-native三组、rc24-hermit-production-android及-seed1各两次实际HOME前后台、rc24-dwarf-android-lifecycle单组全部绑定333280...。所有finally恢复GameSave与全部localStorage并reload核验，私有backup不归档。原生实测胜利9.3526→4.5529秒；仙人good12.754→4.215秒、bad13.946→4.509秒，首句含原3秒演出分别7.221/7.465秒。只为本机观察值，无实体ARM结果。旧候选证据保留rc24-before-bundle/rc24-blob-candidate，不混用最终hash。

源码engine.mjs与RC22一致，349规则/输入仅引用旧基线，本轮未重跑全规则。剩余Events13完整组合、矿山语音、复杂遮挡、AI/RNG/镜头/PC二进制存档等见RC24-PC-FLOW-AUDIT.md。专用5580当前RC24并已恢复原存档；5185只读preview当前app/dist。原先3个agent在客户端工具更新时消失，后续bundle_fastpath完成dataURI和浏览器回归，root完成最终native全部，REA静态会话已由board关闭。

--- 以下历史 ---

# 最新交付：RC23 场景加载与后台清理（2026-11-10）

APK releases/1.0.0-rc23/DingdangTouch-1.0.0-rc23.apk，code54，236599180 bytes，SHA256 f34190973842a62caee4e6e3ce6f0a08e7bd1f19a57cbe03dbdef66c9ffaaca7，同RC22签名。tools/archive_feedback_rc23.py归档；VM仍RC11。

scene-image-loader.ts（注意不同于既有image-loader.mjs）load→decode、默认4并发、超时/取消/同批错误清理，接monthly/ending/victory/certificate/pc-title。main证书传sceneSignal、退出忽略迟到错误并保持曲4。hermit-view组件冻结hidden时间/RAF/声音；生产main原先后台会openMenu销毁组件，这个逻辑保留，不称生产原来必跳帧。状态栏hidden立即取消过期移除反馈。

加载器5单测+4真实浏览器异常/取消检查、仙人组件/HUD回归、生产结局5组含完整片尾、仙人三尺寸前后台通过。最终APK实际SHA绑定三组结局native，以及good6/bad24各选择前/结果离场中两次HOME→前台检查；恢复不重抽/重奖，保存重载完全一致。所有原生验收恢复GameSave和全部localStorage，reload核验。规则未改，仅引用RC22的349规则基线，未重复全规则测试。

尚存明显等待时间：本轮模拟器胜利首图约10.6秒，仙人首次/续档12–14秒、首句约15–17秒，图片成功后流程正常；不称性能改善。原小矮人额外动作/Events13叠加/矿山语音、PC逐帧、AI/RNG与PC存档等差异仍在。无实体ARM结果。详情docs/audits/RC23-PC-FLOW-AUDIT.md。专用5580当前RC23，5185为audio开启的只读preview app/dist。

--- 以下历史 ---

# 最新交付：RC22 原版月结/结局、仙人、退出与矿山演出（2026-11-09）

APK releases/1.0.0-rc22/DingdangTouch-1.0.0-rc22.apk，code53，237603631 bytes，SHA256 d9024e89a333784eea98c62bec666e695a8ea4001d6242c7fdba607f9e4da2ed；签名保持9ef28ec650b16db2185152d77b8505ce055ca511270534050feffac8e8efa4f3。可覆盖旧版。VM仍RC11。tools/archive_feedback_rc22.py归档，verification.json逐项列出实际范围。

原PC v126 SHA b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1。月结按475a8d/483d4c两阶段：原四人明细与净资产排行、曲9→10，提前领取只首阶段。失败473ca6原八字母演出；真人46f0e8原片头、两页成绩、证书、470dc9原1520帧片尾；黄耳ID6按原分支跳证书。main.ts场景AbortSignal、show/标题/切档清队列，晚到资源不插入新菜单，保存不重复结算；短横屏/竖屏固定同一底部按钮行。

仙人415d50/4166fd出现、对白、施法、箱子、结果、合箱、离场与45tick完整接入。engine.hermitResult.appliedEvents记录实际attach的新对象，覆盖反弹/多人/同状态刷新，restore严格校验且兼容旧存档。16种持续状态原图横滑点查，实际删除Events12；Events13是能力触发不是到期。状态栏切玩家不误判结束。42退出入口核查，item-lifecycle-presentation接分身Tools33、竹蜻蜓42、五类跟随者、缩形隧道/任意门原退出；自然到期先于下一行动，隐藏旧角色到原控制帧；狸猫/蜜蜂/交换资产无原资金动画则不造。矿山取款先倒放再现金，存款正放并现金，交易先保存，预览/取消无成功演出。

Android实测发现Image.src后立即decode时部分新仙人PNG偶发reject；所有文件和RGBA与原素材一致，420并发或仅限8仍失败，先等onload后decode的420张零错。hermit-view共享loader改为onload/onerror→decode、8并发，44原失败帧canvas像素逐张对齐；没有改图/重绘。界面失败提示友好，控制台保留资源URL。旧候选APK 9bcda2...与失败记录保留为历史，最终d9024e...新包重新验收，不能混用旧hash报告。

验证：349项规则/输入全回归；engine元数据加严后9 targeted；loader/关闭/失败回归；原月结/结局三尺寸和完整50秒片尾在浏览器实播。最终APK已重验月结9→10、AI字母→标题、真人两页→证书、仙人good6/bad24和保存重入、状态图触摸、分身24/竹蜻蜓38退出与重载、矿山取款75%实际原现金从frame60开始且余额1500/500冷恢复无重复。仙人状态点查使用独立有效P1 ready展示夹具（真实好箱继续已经切P2），点查前后snapshot相同，报告明确边界。最终APK22197文件逐字节核对，无开发服务器，签名与安装后SHA相符。

QA说明：CDP screenshot遗漏canvas层，最终视觉改ADB真实屏幕且目视；月结另读canvas像素。模拟器连续54h后系统91%CPU（kernel68%、softirq21%）及meminfo命令超时，所有存储恢复后冷重启同AVD不清数据，真人加载约1.3秒、退场约3.4秒恢复。每组原生测试先落盘备份、限时、finally恢复GameSave和全部localStorage并reload核验；私有备份只留work/qa-private-backups或测试目录，绝不归档。专用5580当前最终RC22，已恢复测试前存档/设置，5185仍app/dist。子agent均完成；REA会话均已关闭。

仍有差异见docs/audits/RC22-PC-FLOW-AUDIT.md：小矮人121–124额外动作触发未证实、Events13所有能力组合未穷尽、全部地图遮挡及全部角色矿山语音未整局逐帧验收，字体/触屏布局/AI/RNG/镜头不同，不支持PC二进制存档。无实体ARM测试；不称全PC完全一致。

--- 以下历史 ---

# 最新交付：RC21 棋盘选中框、仙人宝箱与现金演出（2026-11-09）

APK releases/1.0.0-rc21/DingdangTouch-1.0.0-rc21.apk，code52，234979540 bytes，SHA256 4e0f2a96901ecf1f65657975cb5aa7ab3377fb56e47d3b4018c12ee54fe57173；签名保持9ef28ec650b16db2185152d77b8505ce055ca511270534050feffac8e8efa4f3，覆盖安装。tools/archive_feedback_rc21.py归档证据，verification.json记录范围。VM仍RC11。

图1精确复现小镇lot825、胖虎road875，根因selected黄框最后绘制而不是人物坐标；RC20漏测点击选中。现在选中/落点框先于人物，正式RC20 APK同状态44个橙衣像素被盖、RC21为0（小镇和未来两图）。REA47ad69确认static flags class5/7、左锚x-40；移除object<260，恢复恐龙商店牌265；map-art.mjs按原资源高度扩展裁剪。角色480db7→401faa原锚-40/-20不变。BOARD-RENDER-RC21.md详述证据。

hermit-view.ts/css与pc-hermit素材接原仙人、箱子、箭头、结果动画6/7和合箱8，native序号0右/1中/2左。main选择不改变引擎，只确认一次；engine notice带hermitResult{event,good,selected}，restore校验并兼容旧无元数据存档。已解析DAT音效11/13、15/32，跨帧只播一次；dialog关闭即停止RAF/音效。三种尺寸组件/生产页面、最终APK好event6和坏event24均通过选中不改state、重复确认防护、结果保存重载不重抽、不重复奖惩和继续。

rent-presentation.mjs仅消费提交前后状态，27段Anime.dat现金动画/64PNG；租金沿当前人物与邻地产方向，非跨地图飞向地主。main加载cashArt、播放pose5/6和原PNG运动，暂隐藏邻建筑、显示金额；买地、升级、卖地、奖励/征罚及奖金池共用。升级高度使用旧level，原442ffe虽先升级但明确传(level-1)/2。先保存结果后播演出，冷重载不重复扣钱；dwarf原替身优先，0x200是对象pose锁而非effectCapabilities。CASH-PRESENTATION.md含限制。

验证：329项全规则/输入回归通过，随后现金1→2/3→4边界增测，现金7项+仙人存档1项共8 targeted通过。构建tsc/Vite/Gradle通过，21019打包文件逐字节核验、签名与安装后APK哈希一致。浏览器现金5项；最终APK现金原图绘制、暂停帧冻结恢复、冷重载余额不重复验证通过，原生暂停动画时入口因CDP延迟用页面真实menu.click，恢复为CDP触屏，不能写全程触屏暂停。正式报告以rc21-cash-ui-android/report.json为准。

原生验收首次坏箱导航在场景出现前超时，系统/CDP亦迟滞；原生存档备份只在失败进程内，后来从LevelDB WAL恢复之前完整local save及音频设置，匹配历史native日志3711字符前缀（日志截断，不能声称历史native完整逐字节证明），恢复两存储后仅重开APP，重测好坏分支过。此后测试先落盘backup、限时导航、finally先刷新到标题再恢复全localStorage/native并核验。诊断与原始WAL仅本机test-results，敏感备份不归档到交付目录。现金最初两轮已画原PNG但CDP往返错过1.5秒暂停窗口，不计通过；最终在真实绘制后调用生产菜单验证暂停逻辑，详见QA notes。

本轮用REA重新核对新PC主流程，docs/audits/RC21-PC-FLOW-AUDIT.md及25状态registry，research/rc21-root-flow-evidence.json为原证据。后续仍要补月结/终局原演出、矿山/仙人后续动画链、道具资金/状态结束反馈；AI、随机数、手机布局及PC二进制存档兼容并非逐帧等价，无实体ARM测试。不要再把当前版本称作全PC完全一致。

--- 以下历史 ---

# RC20 十项反馈修复（2026-11-09）

APK releases/1.0.0-rc20/DingdangTouch-1.0.0-rc20.apk，code51，233604845 bytes，SHA256 954974ebc0e194dc2d497c62be993a818c9d9ad60056945184eef24fdea2f3fd。同RC19签名覆盖安装。名称叮当大富翁，新铃铛骰子adaptive/legacy图标。归档tools/archive_feedback_rc20.py，87证据，verification.json。VM未改仍RC11。

商店renderPrompt保留buy/sell目录、选择和scroll，连续交易正确刷新现金/数量；shop-view.ts移除分页变滚动图文目录，新增use模式口袋。口袋42种+重复数量，返回详情保留选中/scroll，空口袋隐藏空img，user-select:none双保险。inventory.mjs澄清徽章/幸运枪/复原光线描述，未改规则。main仅相应流程；不要退回旧分页选择器。

竞速图1精确复现剩8秒/P4 13分时y3987离屏，输入仍有效；minigame-view.ts后方真人动画小窗、速度/加速次数/防守/受击提示，新minigame-touch.css单真人整行按钮深字；不改原物理。浏览器12连点/防守松手/暂停恢复/受击恢复及横竖屏过，17原生小游戏回归过。最终APK确认P4 12次加速+防守，暂停仅浏览器验证：早期native脚本scrollIntoViewIfNeeded在动态按钮等待稳定会耗尽30秒比赛，改直接坐标，native末尾不再要求时间已结束的暂停按钮。先前失败测试是脚本定位/时间问题，最终报告明确scope。

地产黑剪影根因terrain固定小镇32基址、未来图13产生JS负余数，P4 level1取错169黑占位。新property-art.mjs以原47edd1道路方向（含47b800）计算，497地产与原x86相等，69580组合检查。空地基移地面层，升级建筑仍深度排序。main绘制/inspect接board-cell-info.mjs，红/黑铜锣烧分别奖励/征罚并给实际规则说明。PNG/atlas1824张像素一致，未篡改原素材。PROPERTY-ART.md含范围限制。

验证：322全规则输入通过；42道具真实触屏/施放/回放/存档通过；最终dist商店3尺寸连续买卖/冷恢复，口袋2尺寸全部42种图文/数量/实际滑动/900ms长按不复制；未来图同镜头五级/实际升级+冷恢复/圈说明通过。最终APK android-feedback-rc20.cjs三组：连续购2件，真swipe42口袋，P4输入；原native及全部localStorage在finally恢复。20662资源、签名、aapt app-label/version通过。专用5580安装RC20。静态5185仍app/dist（session55197）。全部子agent完成，未新开REA会话，原生证据用只读反汇编/Unicorn。

仍无实体ARM；本轮为用户10条反馈专项对照，不声称全PC完全一致；结局/月结开场及部分仙人音轨等仍有差异。用户希望整体继续准确复刻，优先实际问题，不要以测试数替代完整性。

--- 以下历史 ---

# 最新交付：RC19 场景音频与菜单衔接（2026-11-07）

APK releases/1.0.0-rc19/DingdangTouch-1.0.0-rc19.apk，code50，234492520 bytes，SHA256 53f5908a270895c5b3a4c19349d0c7d1656c7bc2d759de33e30febef895215bd。同RC18签名可覆盖安装；VM仍RC11。本轮归档tools/archive_audio_rc19.py，47份证据和verification.json。

新PC确证：选人46772d，切角77、Ready bank0/59、最终确认82、退出74；六正常角色解包SHA与资源一致，黄耳原资源缺该条不替代。新增selection-audio.mjs，pc-selection.ts第三参语义callback含previousCharacter；main.ts在两种选人流程接回调。租金443bb1补地主bit4关闭时访客78→地主jail75/amnesia70/其他10，付款方自身免租仍静音。

musicForGame：最小席位赢家真人曲4，否则6；小游戏结果11；常规月结结果converter<0曲10、提前月结9。main独立arcade finish scene11、setup清场景并sync inactive、enter清override、ranking2；结局再玩一局不残留旧音乐。audio.ts曲6/11单次，resumeMusic排除ended避免触摸/音量/生命周期重播；新403f80→485288→485421 flags&2循环原指令已核，旧403dd0同语义。

验证：318规则/输入全过（test-results/rc19-all-rules.log）；Chrome19真实命令播放、10首OGG和36语音解码无错；0.2秒合成PCM真实HTMLAudio生命周期5项通过。生产UI Chrome与最终APK各8组真实touchStart/touchEnd场景（六角色、确认、真人证书/再玩一局、AI失败、练习result/retry、排行榜、两种月结）；APK7组道具回归全部通过。20662包内资源核验，签名同前。新tests/scene-audio-ui.cjs支持QA_ANDROID=1、QA_REVISION；会备份/恢复native及全部localStorage含证书，插夹具先reload到inactive，避免active卸载时自动保存覆盖夹具。Android ADB截图已目视。专用模拟器5580当前RC19并恢复测试前存档。

本轮未重跑24长局：RC18的471034命令为规则基线；RC19不把旧长局说成新代码实测。资料docs/audits/selection-audio-2026-11-07.json、v126-ending-music-coverage.json、docs/rules/AUDIO.md与包内evidence。三子agent任务结束；mini/selection REA已关闭，audio只用只读反汇编，无新REA遗留，root没有打开REA。静态5185仍服务app/dist。

仍有差异：原GAME OVER八字母弹入/月结9→10两阶段动画未复刻；现有常规月结直接显示入账结果用10；仙人各奖惩/NPC音轨及全部对白停顿未确证。无实体ARM验收，不称全部PC等价。下一步可继续这些演出/音轨，已交付不能再称选人/胜负音乐完全未核。

--- 下文为历史 ---

# RC18 连锁规则与小游戏语音（2026-11-07）

APK releases/1.0.0-rc18/DingdangTouch-1.0.0-rc18.apk，code49，233563624 bytes，SHA256 543a1b3a5461bf179717e4ffff91aa3171a64eecbd35fa179693b8e978692159。VM仍RC11。打包归档tools/archive_chain_rc18.py，83份证据，包内verification.json；签名同RC17。

新PC确证并修：special-buildings.mjs导弹成功反射移除相机（失败保留、仅一跳）；hermit.mjs事件30用region3坐标资格，事件22全体缩小跳过已小者。audio-rules.mjs加小游戏结算bank0/17、18，严格最高奖励选择，新PC446219/21c、44d9be已核。三代理已结束；REA会话均关闭。

新证据：camera-v126-coverage报告，840道具反射原指令+120导弹样本(110产品可表示)；diamond-hermit-v126报告全部35事件分类，47原版函数、16helper原生样本；audio-rc18/playback.json实际15命令播放0错误。相机/钻石raw evidence保存docs/audits、research和tests/fixtures。

311规则/输入测试通过。RC17基线及修后RC18新PC八图各24局/120日上限长局均通过，471034步，AI触发41道具和8小游戏，反复存档恢复。基线RC17完整8场比赛、16个单人/四人小游戏触控得分/存档/旋转场景+1结算通过（test-results/rc17-followup-*）；界面本轮未改。最终RC18 APK七场景实际触摸、回放存档通过，包含发射导弹反射回自己并消耗目标相机；ADB真实截图已目视。Android测试finally恢复原native/localStorage存档并reload。专用5580运行RC18。

修了两个测试工具问题：minigame-ui防守检查需等待原版碰撞硬直mode16恢复后再断言mode8；audit_item_b_native.py导入时不应写半份结果，已去掉顶层写文件，完整fixture从已归档RC17恢复后全回归通过。不是游戏规则修改。

尚无ARM手机验收；尚未穷尽任意状态历史，选人、全部仙人/结局/排行榜音频与逐帧演出仍有未确证项。不要称全部PC等价。

--- 下文为历史 ---

# 最新已交付：独立RC17，道具逐项审计（2026-11-07）

独立包 releases/1.0.0-rc17/DingdangTouch-1.0.0-rc17.apk，code48，SHA256 ef831f10806423c8c2d21d74726608b8200212c8c9995fe3ef769d93c0b231c6，233563454 bytes。VM仍为RC11，本轮未改。可覆盖安装，RC16/17签名一致。

42项均完成新PC入口/规则核查，报告 docs/audits/PC-V126-ITEMS-2026-11-07.md/json，三代理part-a/b/c报告和原始REA证据均保存。5类确证修正：幸运枪新PC阈值>=251(749/1000好运，legacy地图规则保留>=751)；睡意枪来源可选静香(大雄)；小矮人/竹蜻蜓互斥；交换布清军队；处境掉换枪清怨恨头带。复原光线level>0门限正确，特殊建筑本来level1，本轮仅加联动验证，不要错误放宽level0。

根代理 tools/audit_item_common_v126.py 执行新PC44构造、7744互斥查询、4680公共攻击样本；完整79x79表发现5格差异，原生fixture tests/fixtures/v126-item-common.json，产品新表 app/src/v126-effect-tables.mjs。3代理补原生幸运枪1000样本、空气枪2000样本、32睡意来源、490掩码等。原生隔离执行并非全PC整机场景穷尽，报告保留各项边界。

302规则/输入测试全过，42道具Chrome触屏/命令回放/存档全过；APK资源20662项与签名验证通过；tests/android-item-audit-rc17.cjs验证最终APK 6场景，实触摸/动画/状态/回放/存档通过，ADB真实surface目视正常。Android控制器会在道具动画后自动nextTurn，测试预期需包含nextTurn+beginTurn。测试保存并在finally恢复原native/localStorage存档且reload。

专用DingdangTest 5580旧qemu/ADB无响应，重启同AVD(不清数据)后安装仅3秒并完成验收；当前独立版RC17在模拟器。未验证实体ARM。各代理REA会话已关闭；根无打开会话。归档 tools/archive_items_rc17.py，verification.json含证据清单和哈希。

--- 下文为历史状态 ---

# 最新已交付：独立RC16 + VM RC11（2026-11-06）

本轮完成并归档：releases/1.0.0-rc16/DingdangTouch-1.0.0-rc16.apk code47 SHAdeb0fd4c27b4ee284a18c0b1776bb9668a0018af190ab6fdd5437a89525bc0f9；VM releases/vm-0.9-rc11/DoraemonOriginal-0.9-rc11.apk code19 SHAe0b82d13dc8163a2d6dd1ae604814b087661060a9580acf3594fbe569c578838。归档脚本tools/archive_feedback_rc16.py通过，两个verification.json/SHA256SUMS/README与证据同目录。

独立：原图/图标和玩家卡片、长按防选字（输入框例外）、暂停覆盖避免小屏溢出；分身center/提示；新PC确证狸猫套装自家地租金修复；音频冷加载/暂停/音量取消及标题、小游戏曲5、普通回合高频语音。42道具触屏回放恢复通过、27布局通过、284先前全规则+11最终audio/clone测试、13真实引擎音频事件Chrome播放通过。最终安装APK原生CDP触摸：标题语音started、练习曲5、长按无选字、实际两次分身买地/成交语音通过，安装包SHA与归档一致；20662资源/签名通过。CDP截图会漏Android硬件canvas，ADB真实surface正常，最终rc16-android-clone.png使用ADB截图且目视通过。不要误把临时CDP黑canvas截图当游戏黑屏。

VM：修整组控制器poll快点序列、八图标识别、跨场景旧鼠标点击清理、布局变动手势拒绝、兼容click去重。最终APK 5连点第三图标仅进一次id2，120真实交替触点全部到native，含ready左61右60，1390poll中无mask3；P1 00→15，之后42.3秒全0。29输入/61浏览器覆盖；engine tsc和6+2相关测试通过，82原资源31语音/签名通过。模拟器曾系统卡死，子agent console kill重启同AVD未清数据，恢复后验证。

42道具证据差异表docs/audits/PC-V126-ITEMS-2026-11-06.md/json明确新PC未覆盖，音频仍有未对齐变体/时机，不称完全PC等价。无ARM真机。REA已保存research/audio-rc16-original.snapshot.json并关闭。模拟器5580当前独立版，native磁盘恢复测试前存档；页面fixture仍临时显示，重启会读原存档。子agent本轮都完成；root static server5185供后续开发。

--- 本轮工作过程与旧版（历史）---
# 当前任务进行中：新反馈修复 RC11 / RC16（2026-11-06）

用户反馈RC10触点偏移/重复/跑步不响应；独立版缺语音音乐、长按复制、道具尤其分身不对、界面希望图文并与PC核对。不要把下文旧交付当本轮完成。

root：action-art.ts、main.show常用动作/道具/目标头像，style全局禁止长按选择/拖图但输入框允许选字；touch-dialog选人设置图标；玩家资产头像卡片；小游戏暂停提示改覆盖层防短横屏溢出。27布局与长按两尺寸测试此前通过，刚新增玩家卡片待最终build验证。版本已升独立rc16/code47、VMrc11/code19。完整规则284通过。静态server5185(app/dist) session66174，不要依赖Vite。

mini_fix：REA新PC确证分身链逐人停靠；main.center/renderPrompt跟随visitAt并标本体/分身；修狸猫套装自己的地也转租金施术者。19针对回归与UI双购地冷恢复通过，42道具审计docs/audits/PC-V126-ITEMS-2026-11-06.md明确未覆盖；正在test/all-items-ui 42项全触屏，别覆盖dist。

shop_fix：独立音频丢冷加载/暂停序列/音乐音量误停语音/小游戏曲错误已修；8真实解码生命周期测试和4场景测试通过。继续接原版租金、升级、奖罚、破产语音，尚未定稿。main仅音频局部；REA它管理新PC会话。

selection_fix独占模拟器5580：修快速左右输入合并/短按序列、布局变化期间坐标、原版小游戏选择八图标菜单识别及延迟鼠标清理；RC11已构建安装但仍实际快点验证中。模拟器曾严重挂起，已console kill重开原AVD无清数据，首帧13.9s。root暂不碰Android。

下一步：等42项和音频定稿，统一独立APK构建、资源/签名、UI新卡片/图标、实际Android音频/长按/分身测试，交付档案；VM需agent真实跑步快点验证，不把单元测试冒充完成。

--- 旧版已交付记录 ---
# 本轮已归档交付：RC10 + RC15（2026-11-06）

两个最终APK位于releases/vm-0.9-rc10及releases/1.0.0-rc15，acceptance/verification含hash及实测证据。VM最终SHA56b71c74e031856e5fe8be17549603046d0beef0ce2a4747289f3cbee2d83396/code18，单人选角、原版人物气泡“点击继续”→返回棋盘→实际掷骰行走通过并目视；按键消费1126ms，含截图/ADB/等待的气泡消失2495ms。35输入回归通过。首帧59.553s，16s掷骰区间4.93FPS，诚实保留，不能宣传提速。SEH识别原44dcc9栈对象解决全局dialog根漏识别。REA已关闭。

RC15最终SHA90be526697418810f4d7c8cb834cff5c90e942fbe6f31da4ec88830b33645094/code46；三尺寸图文商店/买卖/续档、小游戏准备暂停/重试/两种各1及4真人精确回放、8练习8比赛、横竖新局掷骰行走均通过；最终Android包真实商店购买、练习准备暂停继续、掷骰走路、断网冷启恢复精确存档通过。20662资源及签名通过。

仍不是已证明逐项原版等价：独立版呈现/AI差异、VM启动/性能限制、无ARM真机。当前模拟器VM棋盘，所有本轮脚本已结束，勿把旧断点当未完成。测试脚本vm-18-final-speech中初次地图确认过早，实际补了两次正常nav确认后完成原版新局；不修改guest状态。首次候选hash2ae...不是最终交付，归档只含最终56b...。

--- 本轮过程（历史）---
最新补充：RC15已归档releases/1.0.0-rc15，实际APK商店/小游戏/掷骰通过，断网冷启+原存档精确恢复通过，完整八练习八比赛通过。VM精确SEH栈气泡识别已实现，最终code18哈希56b71c74e031856e5fe8be17549603046d0beef0ce2a4747289f3cbee2d83396，35输入回归/82文件/31语音/签名通过，已install。selection_fix正在独占安卓新局真实气泡验收，勿切前台。VM包未归档，须真实确认后才能交付。

# 当前进行中：用户反馈修复 RC10 / RC15（2026-11-06）

尚未交付：VM code18/0.9-rc10已构建验证82原文件/31语音，32输入测试通过，但实际新局“游戏开始了”对白仍卡，selection_fix正在安卓只读诊断。两个dialog根均0；不可仅凭分页单测宣布修复。模拟器5580保留现场，勿强停。原始来源ddraw.ini变化，已从已验收RC9提取82文件到work/vm-original-verified，build-web改为逐项验证后打包，D盘未写。

独立code46/rc15已构建安装但未启动：APK SHA90be526697418810f4d7c8cb834cff5c90e942fbe6f31da4ec88830b33645094，233559878bytes，20662文件一致及签名通过。商店42原图/说明/固定分页买卖三尺寸通过。小游戏准备/暂停恢复/出局提示/练习重试及id1/6四组存档回放/奖励通过。仍待实际安卓验证和比赛脚本适配。tests/android-rc15-mini.cjs已准备。

shop_fix做基本流程静态回归；mini_fix补比赛8场；selection_fix查原版对白。静态app/dist服务器5183可用，Vite因连接不响应不可依赖。当前test-results rc15相关及vm-18相关为本轮；正式交付目录尚未创建。

--- 上次交付 ---
# 当前交付候选：VM RC9 + 独立 RC14（2026-11-06）

本轮实际完成：VM RC7完整8场→总分No→Yes→胜利→原新纪录23130/第8/FFF→稳定比赛菜单；截图均目视。原注册表安装key及Data持久化已修复。RC8误加surface偏移导致命中错误，未交付；实际runtime菜单已经是绝对坐标。RC9去掉偏移，仅把棋盘设置项原5px点击高度扩为37px，最终29输入测试通过。

RC9/code17归档releases/vm-0.9-rc9/DoraemonOriginal-0.9-rc9.apk，363276251bytes，SHAdaf3a9f3c601edecbec1d2d1e8c24b006700963cc958dfbab64700d63df900c2。82原文件/31语音段/签名通过。实际最终包：直接点击设置→原保存确认→断网重启→FFF23130排行保留→原存档列表→Nov5棋盘→直接点骰→走到商店→后台5秒冻结音画且同会话恢复，全部目视。save0000新SHA4f10187e...，registry1ff3adc7...，before/after一致。网络恢复airplane0/wifi1/data1。

断网确认后冷启53083ms；真人骰至商店353frames/15190.6ms=23.238FPS，点击消费25.9ms，含商店静帧，不能称纯移动FPS或ARM性能。最终包八场未重跑，acceptance明确继承RC7原哈希完整比赛证据；RC9与RC7只有棋盘命中高度变更（及注释空白）。完整enginecheck1384pass/6Windows工具失败；类型检查过。不能写全绿。

归档脚本tools/archive_vm_17.py已成功，20个证据hash及acceptance.json/SHA256SUMS/README。独立RC14仍原1a184...及此前验收。两包可测试，但非已证明所有PC细节完全一致：独立版已知AI/演出差异、VM冷启等待、无ARM真机、全地图长局未穷尽。先前各候选未通过的状态均历史；交付说明指向RC9。REA关闭；无运行测试driver；模拟器当前原版商店场景。

--- 以下历史记录 ---
# 最新断点：RC7 正在最终比赛（2026-11-05 20:57）

RC6(code14)八场/Yes→胜利→P1新纪录26100/第6位/BBB录入成功且registry落盘；但returned-menu.png只拍到黑色转场，之后遗留原鼠标tap延迟14915.5ms在菜单中生效，误进新选人页。已加releases/vm-0.9-rc6/NOT-ACCEPTED.md，不能交付。

RC7(code15)在record上下文切换时touch.cancel/menu.clear/navigation.clear并丢弃pendingTapId，防止winner阶段的mouse队列跨keyboard-only姓名页重放。新增只读menu-state供canvas aria-label及验收判定；脚本必须等mini-title ready后再稳定7秒，不能以record=null误判成功。原engine代码未变，前轮1384pass/6平台失败、3registry+4WINMX、28输入测试仍适用。

当前安装归档releases/vm-0.9-rc7/DoraemonOriginal-0.9-rc7.apk，363276219bytes，SHA67b374e9bd71699550ed36ee144515ebafa4efbfdd63b2f2bacefec37cf190b9，hostindex-DbJPZU-V.js/workerGuest-BvDxVVfb.js；82files/31voice/signature均通过。firstVisible16081ms。test-results/vm-15-apk-validation-final.json且vm-09验证JSON复制同值给通用测试。

当前exec session62178串行最终Android八场→record-flow，输出test-results/vm-15-android-competition/和.log、vm-15-android-record-flow.log，约g3活动中。不要并发输入！record-flow脚本改名初始偏移5，P1会输入FFF（区别RC6旧BBB），其他可能GGG/HHH/III；只有超过原版原始5000分门槛的真人才进名字页，不能强行造分/清排名。RC6前只零初始表所以四人都录入，是之前缺安装key的后果。

待完成后：必须目视final/result-no-selected/celebration/name-0-entered/returned-menu，确认稳定比赛/练习菜单。随后按计划真实保存、断网冷启、原排行看到FFF+本次分数、存档列表、载入棋盘、存储hash含registry前后一致、真实掷骰15s、后台暂停5s同局恢复、恢复网络0/1/1。tools/archive_vm_15.py已准备且要求vm-15所有证据+registry-cold-review.json。README已复制RC7，PENDING.md存在，验收过后删除并生成acceptance/SHA256SUMS。docs/DELIVERY-INSTRUCTIONS/runtime-touchREADME仍旧RC1，最后一起更新。独立RC14保持已验收SHA1a184...。

新registry说明research/VM-REGISTRY-PERSISTENCE.md。当前只x86_64安卓15模拟器，不能声称ARM性能验收或引擎全check通过。最终用户要两包一起测试，别用中间进度结束。REA仍关闭，桌面QA关闭，无活跃子agent。

---
# 最新断点：RC6 最终八场验收中（2026-11-05 20:38）

当前安装/归档候选 releases/vm-0.9-rc6/DoraemonOriginal-0.9-rc6.apk，code14，363275947字节，SHA0dfa1b6fd10ef677e8b60aa79759c093b8a23f3cf1f93e682441de5f4203285a，host index-CXHml4ys.js / worker workerGuest-CNGokdLX.js；82文件/31语音段/签名通过。独立RC14仍原哈希。

RC4偶发No→Yes退出根因：原45c732每帧释放/重建两个标签，原识别依赖label非零，在中断边界可能返回null把点击退化为mouse。RC5加入64条只读menu-input记录，首场No→Yes正常、全八场手动终场Yes成功；trace中确有一个无context的场间tap。RC6改用稳定owner+phase，阶段2/3早点击消费而不透传，4时按键；不再检查瞬时labels。新回归总28项通过。

RC5实际四名玩家录入CCC/CCC/DDD/EEE后返回比赛/练习菜单，全部截图已目视，test-results/vm-13-record-flow/。但发现原Registry是session-local且没创建安装key，原42cbe0 RegOpenKey失败导致初始排行全零、无法持久保存。RC6 DoraemonShim种空HKLM SOFTWARE\\Gameone\\Doraemon key，Data二进制由原程序默认/加密/校验；应用仅保存原4/228字节至vm-registry.json，下一guest API等待持久写入，错误显式传播。没有访问host registry、修改比分或内存。3专项+4WINMX测试通过；完整enginecheck 1384通过/6 Windows工具失败（最终含Git PATH），test-results/vm-14-engine-check-final.log，不能称全绿。新全check测试setInterval进程53656已自动结束；43192为旧17:40残留，未触碰。

当前exec session45658在Android5580跑最终完整八场，输出test-results/vm-14-android-competition/和.log，约g3完；完成后自动tests/vm-android-record-flow.mjs，先No→Yes，再原winner/newrecord/name/END/menu。请勿并发游戏输入。首次可见12458ms。REA仍关闭；静态新增capstone research/v126-ranking-read-disassembly.txt，说明VM-REGISTRY-PERSISTENCE.md。

完成后必须目视final/result-no-selected/name-*-entered/returned-menu，生成真实visual-review.json。再真实新保存→断网冷启→主菜单排行可见实际名字分数（cold-ranking.png与registry-cold-review.json要求）→原版存档列表load-list.png→loaded-board.png→保存前后哈希（包含vm-registry.json）→human-roll→native-pause，恢复网络0/1/1。tools/archive_vm_14.py已准备，严格要求上述实际证据，不得伪造。README候选已写待终验描述，目前acceptance.json缺失，尚不可交付。docs/DELIVERY-INSTRUCTIONS和runtime-touch/README仍旧RC1，应在最终成功后更新RC6。旧RC1/2/3/4都有NOT-ACCEPTED。

脚本node24绝对路径，ADB相邻aichatbox SDK，CDP9271；桌面QA已关闭。模拟器x86_64 Android15 hostGPU/-Vulkan，无ARM实体机验收。原用户强烈要求完成再答，不要以中间进度结束。

---
# 最新断点：RC4 终场失败，RC5 输入诊断（2026-11-05 19:49）

下方历史“最终/通过”不可当当前验收。RC4/code12 SHA7a1175...实际Android八场比赛已到总分（P1 28575），但测试先用右键选No再点Yes错误退出到标题；record-flow没有姓名事件，RC4已加NOT-ACCEPTED.md。不能交付RC1～RC4。

新增有限menu-input记录（仅触点、菜单上下文、目标/选中项及输入键，不暴露可修改VM接口），RC5/code13已build/install。test-results/vm-13-apk-validation-final.json为实际哈希；vm-09-apk-validation-final.json临时复制该值供原竞赛脚本读取。首画面15994ms。当前exec session48429正跑Android第一场到场间总分，VM_COMPETITION_LAST_GAME=0，输出test-results/vm-13-first-result/，用于复现No→Yes并读workerMenuInput。不要同时发游戏输入。session74884安装/进场已结束。

桌面同RC4源码对照：第一场原总分No→点Yes正常进入第2场；真实状态在test-results/result-right.json、result-yes.json，截图vm-result-touch.png。生产桌面QA已关闭专用浏览器和node39376，避免抢CPU。新增tests/vm-result-observe.mjs使用CDP只读原地址，没有写RAM。Android WebView CDP不暴露worker，故加入上述输入记录。

tests/vm-android-record-flow.mjs已加遇到意外新小游戏立即失败的保护，避免盲点中心重新开始比赛。尚需根因修复、最终八场→胜利→纪录名→返回、最终包离线保存读取/暂停/性能；不可用旧包结果冒充。tools/archive_vm_12.py目前不会通过且不可伪造所需文件。

独立RC14仍为原归档及哈希。VM说明docs/DELIVERY-INSTRUCTIONS.md/runtime-touch/README.md仍旧RC1路径，发布前必须更新。网络0/1/1，模拟器5580/CDP9271。当前没有活跃可用子agent，REA已保存82证据record-input.snapshot.json并关闭。

---
# 当前断点（2026-11-05）

## RC2 新纪录流程修复（最新，覆盖下方候选状态）

0.9-rc1/c522... 的八场虽已完成，但选择最终 Continue=Yes 后进入获胜、新纪录页，原导航误用选人时的P4控制器，不能给纪录所属P1确认；所以已标记 releases/vm-0.9-rc1/NOT-ACCEPTED.md。先前“选择No返回菜单”仅证明提前退出，不能代替新纪录流程。

REA重新打开原EXE，原45e999/45f256表明新纪录和名字页分别只读取当前纪录玩家的设备。已加 `recordControls.mjs`，按独占sprite根+排名+角色+分数唯一匹配原席位；navigation自动绑定该席位，UI自动展开并显示P几/新纪录或输入名字。四席×七角色×两页56组合、错/歧义拒绝、实际采样绑定3测试及6尺寸/场景触摸布局通过。源码只读原游戏状态，输入走原设备。证据research/v126-new-record-rea.json、v126-scheduler-update-rea.json；REA已关闭并成功保存record-input.snapshot.json（707855字节、82证据）。

当前安装0.9-rc2/code10，SHA `492af57731d66fc1618af699dde1fee5b883f49ece4bda6a3524d3f23e5a0ce2`，363274871字节，host index-XP8yLx-w.js / worker workerGuest-Dc5vDOFw.js，原82文件/31语音段及签名通过。归档在 releases/vm-0.9-rc2，但尚欠最终验收JSON，勿当已交付。首画面两次13088ms/11143ms。

当前exec session98623正在最终APK实际八场竞赛，报告test-results/vm-10-android-competition/report.json，日志vm-10-android-competition.log；完毕后同一脚本串行执行tests/vm-android-record-flow.mjs，真实Continue=Yes→获胜→新纪录→方向选字/确定→END→返回菜单。前次RC2在第二场因测试脚本点中央误选No退出，保留vm-10-competition-input-aborted；已改每轮用真实方向左+确定选Yes，未改产品。当前约第六场进行中。不要同时发游戏输入干扰；只读截图可。

完成后需要目视final.png、returned-menu.png、name-*-entered.png，记录visual-review.json，再做RC2最终原版保存/冷启读档/离线/真人掷骰/暂停。`tools/archive_vm_10.py` 已准备，要求vm-10-saved-before/after-restart、vm-10-final-native-pause、vm-10-human-roll、vm-10-load-list/loaded-board截图及vm-10-offline-review.json。现在这些终包复验文件还没有，不能伪造或用旧c522结果冒充。

原桌面QA9332/9358已完成且停止：确认自身node46004及专用Chrome41120后关闭，避免占用模拟器测试CPU；旧冻结证据仍在。当前Android5580网络恢复0/1/1，CDP9271。独立RC14仍为已验收原哈希，不改动。最终说明需要把docs/DELIVERY-INSTRUCTIONS.md和runtime-touch/README.md从rc1切到rc2，并准确记录新终验指标。

## 最终存读档修复及终包核对

当前 VM 0.9-rc1/code9 安装包已冻结为 SHA256 `c522a55f17f71fbe70e025f103bbd1297186075d60e360db07afbd45fe32c5f6`，363519564 字节，归档 `releases/vm-0.9-rc1/DoraemonOriginal-0.9-rc1.apk`。旧 f915、6d9668 哈希均已被替代。82 原文件/31 语音索引与签名检查通过。

最终发现并修复 files.readPrefix 仅实现 voice.dat、导致 FindFirstFile 看不到持久存档的错误。新增 `vm-app/web/fileRanges.mjs`，真实读取回退，2 专项测试通过。原版 slot1 保存21060字节，断网冷启动后原菜单显示并成功加载，回到11月5日棋盘，两个存档 SHA 前后一致。然后真实掷骰走到商店。没有修改客体存档或状态来通过验证。

最终包真人掷骰至商店窗口403帧/15145ms，26.609FPS，触摸消费2.9ms；含商店静态画面，不是纯行走帧率。复用了 vm-09-human-roll 文件名，旧364帧报告已被新终包报告取代。最终后台暂停与桌面图标返回同一会话通过 vm-09-final-native-pause.json。断网首画面18401ms，恢复网络后15263ms；网络已恢复原状态0/1/1。真实设备仍仅是 x86_64 Android15 模拟器，非 ARM 手机。

最终原版八场比赛正在 Android ADB 实触跑最后一场，进程exec session2479；报告 `test-results/vm-09-android-competition/report.json`。归档脚本 `tools/archive_vm_09.py` 必须等全部八场完成、目视总分并点击No返回比赛/练习菜单后，填写visual-review.json才会成功。不要使用旧桌面八场结果代替最终APK验收。

完整引擎check实际为1381通过/6失败，剩余为Windows CI进程组、POSIX控制启动器/信号和relay sh查找pnpm。类型检查通过。独立RC14保持原归档及验收，SHA重新检查一致，两包签名均通过。两条路线的原版逐帧表现/少数AI差异、全地图长局和实体ARM未验收仍需诚实保留，不能写成所有行为完全相同。

下面记录为此前工作过程，若候选哈希/进程状态冲突以上方为准。

## 本轮原版触屏实测更新

RC14独立版仍保持原归档哈希。本轮VM新增真实方向菜单适配menuControls、四人选角selectionControls/selectionTouch、小游戏每真人准备/结果确认、原版通用方向/确定/返回折叠控件navigationControls/navigationTouch。菜单图1680原x86案例及21输入单测通过，原小游戏触屏61布局检查通过，选角3尺寸与真实触摸通过。源码仅通过原输入设备触发，不写原游戏状态。

原版八场比赛已真实走完（4真人加入/准备，P1实际游戏操作），总分RESULT已目视检查，选择No返回比赛/练习菜单。证据test-results/vm-original-competition/report.json及test-results/vm-original-mini/1793871146115-tap.png。该桌面验证绑定冻结workerGuest-C4vri07P.js，后来通用导航与音量接口改动不在旧冻结bundle内，不得称最终APK八场终验。

VM Android 0.9-rc1/code9已安装测试，原版新局/P1键盘选角/地图/一年/真人掷骰走路均通过。15.1717秒364帧约23.99FPS，含末尾地产对话；34.6ms触摸消费，不能声称纯行走帧率或ARM手机性能。模拟器5580重新使用host GPU/-Vulkan运行，软件渲染曾启动挂住。首画面约14.6~14.8秒、640×320满屏。

发现点桌面图标会再建Activity/WebView，已加singleTask；vm-09-native-pause-fixed.json验证同一timeOrigin、后台5秒guest/audio/frame冻结并恢复。后续APK需重测此项。

设置/存档入口又发现WINMX mixerGetDevCapsA未处理，会中断。已修复DoraemonShim：无Windows硬件mixer返回BADDEVICEID，虚拟CD auxGet/SetVolume真实保存音量并调节PCM增益；4专项+全typecheck通过。最新APK已重建安装，正在Android进入设置保存读取；完整engine check正在test-results/vm-09-engine-check.log。旧6d9668...哈希已不代表最新包，必须重新verify_apk。还欠最终保存→冷启动→读档、离线、最终小游戏/性能复验及两包交付归档。不能宣称完整版已完成。

REA本轮补充research/v126-mini-ready-*和v126-menu-extra-*证据，调用close时服务器已无打开项目（target_unavailable）；没有生成menu-ready新快照，证据JSON已落盘。三份v126-menu-0x4194e4/4197df/419d1b.json是早先target_unavailable错误，正确证据在v126-mini-ready-*。

所有本轮子agent都因额度报错退出，不要重复派遣。根agent已接管。桌面QA是隐藏进程46004，CDP9332/HTTP9358，冻结assets在test-results/vm-mini-frozen。8场脚本进程32724已完成。Android5580运行，ADB转发9271。当前新局验收脚本exec session86386，完整enginecheck session31468（若已结束读日志）。Android暂停前force-stop避免两个旧WebView影响选页。原Windows GUI启动仍不可用，不绕过。

## 14时更新

独立版已推进至 RC14 / versionCode45。新局已接原版道具 AI 的评分、目标、动态权重、对手偏好，以及真人/电脑自动走向。导航的 138224 个原指令样本通过；40 个120日长局完成，752247次指令。42道具全部自然长局使用、8小游戏全部自然进入，35仙人事件另有定向分支测试。六常规角色及黄耳均有长局覆盖。旧存档保留其版本行为。

RC14 全250规则、42道具、17小游戏、26流程、27布局、13负现金/矿山、2原AI、2导航、2证书及8场连续小游戏比赛通过。帮助文字修订后补测两种屏幕帮助、导航2、AI2、flow26全部通过。最终APK SHA256为1a184b6f8bbd744bb8a62ab4573820d0f4e098effa8d63b46c16f8219b64e850，20619资源逐文件匹配。Android终验完成正常菜单新局/4点自动走路、负现金红字、矿山min0/min50和一次事务退出/native精确保存；自然走到第4轮仙人后飞行模式冷启19124ms，精确续档1562ms、2568精灵/音乐正常。原网络已恢复，设备已交回VM，arcade正在归档。Root目视ADB实屏棋盘与矿山截图正常。首建局4729ms、开图2574ms为该次模拟器记录。

VM Worker候选曾测真人17.60FPS。立即ACK与同步Peek候选未采用，vm正在同一场景测试时钟检查步长/键盘端口并整合8小游戏触屏层。原0.7版本真人10.16FPS仍为旧包。root新增可选heapPort，复用原分配器的纯元数据路径，真实v86四模式291调用/模式通过，Android收益待测，默认不启用。

原引擎完整check已执行，首先发现Windows环境/过期夹具与真实catalog遗漏。board修正DORAEMON_GAME注册和Worker timer mock；root修正Windows分发路径分隔符、cache夹具签名和目录junction。最终重跑类型检查通过，1375测试中1369通过、6失败、0未处理异常。6失败限于Windows CI进程组终止、外部控制CLI的POSIX脚本/信号预期、relay发行脚本的sh查找pnpm。真实游戏配置、资源、VmCore与Worker专用128项全通过。完整上游check仍未通过，日志test-results/vm-final-engine-check-2.log；本轮超时测试遗留的单独setInterval进程已按PID关闭。

最终仍需完成两APK的终包验收、安装说明及哈希汇总后一起交付。实体ARM手机尚无测试结果。独立版不能导入PC二进制存档，少数AI子策略/病态输入保护和触屏呈现存在明确差异，不应宣称原EXE逐帧完全一致。

14:48后台暂停补丁已完成。VmCore.setPaused串行CPU停止/继续，ShimState.setGamePaused冻结ScaledClock，paused期间已有异步API等前台后只完成一次，销毁释放等待。clock/core/Worker80项与typecheck通过；完整check-3为1375通过/6个相同Windows工具测试失败，无未处理异常。vm正在接Android生命周期、音频AudioContext挂起和原小游戏后台实测；arcade已经归档RC14，转桌面原8小游戏实触验收。生产0.8旧七步脚本没有正确等到真人回合，自动AI行走不得计入真人帧率。

## 先前状态记录

用户要求两条路线持续做到原版完整游戏，再统一测试；无需中间例行汇报。

独立版 RC12 / versionCode43 已冻结并打包，APK SHA256 3eb600a50110735d7f478da693519125b8a1e29d18e3aec30312ccc5ab87c716，233478062字节。20619个资源逐文件匹配，浏览器225条规则、42道具、17小游戏、26流程、27布局、13负现金/矿山模式检查通过。详细报告在 releases/1.0.0-rc12/verification.json。该包新增v1.26地产AI与实际交易、15日负现金破产、原矿山/商店AI、路过仅取款/周日关闭、月通胀和现金刷新上限；新旧存档分版本保存行为。四十个120日长局及负余额恢复完成。原红字数字及负资产E证书已验证。RC12 Android终包实测尚待设备交接。

RC11完成八图22图集与5730源图逐像素匹配；安卓实触掷骰走路、全屏、离线精确续档和音乐均通过。RC12保留这些优化。地图开图1.875秒、离线精确续档1.601秒的记录绑定RC11，不能代替RC12终包实测。

board 子agent正在 research/v126-item-ai.mjs 准备原42道具施放AI及运行时权重完整替换。已有14112评分/目标、336权重、336排序、8400分类机器码对照；完整扫描及真实地图适配仍在做。RC12尚未包含这些修改，商店算法虽已复现，其权重仍使用初始化表而未接原AI动态权重。

VM 0.7终包 releases/vm-0.7-test/DoraemonOriginal-0.7-test.apk，SHA bb8ae836f25a2fe8cbfc89908237852d92520136e17caf9f47424d962b41c966。82原文件/31语音索引一致，离线首画面30.255秒、640×320全屏；真实小游戏进入/计分/返回完成。正确counter-only真人段93帧/9.154秒约10.16FPS，全窗8.75FPS，触摸消费70ms、骰子可见反应1628ms，仍慢。另带Profiler样本仅作诊断。

主线独立构建了研究用Worker版，research/vm-worker/{guest,host,build,bench,android-bench}.mjs及android目录，生产vm-app入口保持不变。Worker复用原VmCore、代理音频、原触屏队列、消息通道CPU调度与帧ACK；桌面实际真人约24FPS，安卓实际真人154帧/8.749秒约17.60FPS，全窗18.29FPS，无页面错误。test-results/vm-worker-android-human.json及前后截图为证据；不同回合不作严格提速比例。首装启动74.707秒，启动优化和冷缓存区别仍验证。实验APK位于 test-results/vm-worker-android-build/outputs/apk/debug/DoraemonWorkerValidation-debug.apk（code8）。仅研究候选，尚未合并正式VM。

vm 子agent继续0.8有界同步Peek/键盘和主线程MessageChannel试验，以及8小游戏/多人触控输入覆盖审计。实体ARM手机尚未验证。两条路线完整对照与终包验收仍在继续。

## 2026-11-03 记录

用户已授权按评估路线继续修改。本轮已实际接入原版开场标题、任意门动画、游戏子菜单及正确场景调色板，详见 docs/rules/PC-FRONTEND-29.md。新增 app/src/pc-title.ts、tools/extract_pc_frontend.py、assets/pc-front；仍未完成选人/地图/骰子等全部界面还原，不应交付为完整版。原生 APK 尚未重新构建。新发现屏幕版本字符串为 Version 1.26，与 PE 文件字段 1.2.1.0 不同。

REA 已关闭，新增4个回调原始证据 research/v121-0x*.json，最新独立快照 ghidra-front.snapshot.json。新建/掷骰/冷恢复专项浏览器测试记录 test-results/pc-title-ui-report.json；完整 flow-ui 的输出现在在 test-results/pc-front 下。Vite 开发服务端口5178。

用户提供新 PC 包 `D:/Game/old/Doraemon/Doraemon`，要求评估重新逆向或继续修改的路线。1.0.0-rc1 的功能回归通过不代表原版画面/流程还原度已验收；不得继续把先前“完整功能”表述当作用户需求已满足。

本轮完成文件身份、PE/依赖和资源差异比较。新 EXE 自报 1.2.1.0，SHA256 b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1；已复制至 work/new-pc-v121/Doraemon.exe 并独立建 REA 项目。41 个顶层文件相同，主要画面资源一致；八图 28000 条格记录中 59 条变化。当前前端自定义主菜单/弹窗/骰子/镜头是明确偏离点。建议保留可验证基础、针对新版本定向逆向，重做偏离原版的呈现与流程。需要原版实机参照，不以自测代替还原验证。

完整评估见 `rea-analysis/Doraemon.exe-dc85cb62a7cd24df/report.md`；原始证据 `research/new-pc-comparison.json`、`research/new-pc-resource-leaves.json`。本轮未改变游戏代码和既有交付 APK。

新版 REA/Ghidra 12.1.4 已定位启动/资源初始化函数 0x455888、WndProc 0x457da3、640×480 画布配置；证据 research/new-pc-startup-rea.json。已关闭会话并保存独立 ghidra-initial.snapshot.json。project.json 的 complete 仅指本次路线评估完成，不指忠实移植完成。

## 先前交付记录（1.0.0-rc1 / rules28）

先前已产出功能测试包；下述测试结果保留作为历史证据，不能代替本次新增的原版还原度验收。

交付：releases/1.0.0-rc1/DingdangTouch-1.0.0-rc1.apk，219968829字节，versionCode32，town-flow-28。SHA256：830d80bddc5eddac30c3160404d9aef5bf0d40a1818c31cd6c6ba97c650cfb2c。目录含中文安装说明、验证记录、SHA256和verification.json。

## 验收已通过

- 175项Node回归：test-results/node-rules28-final.tap。
- flow-ui25项、all-items-ui42道具、time-history-ui；图集伙伴/地图动画截图已检查。
- 24局120天、八图×3角色组，396811规则推进、40种AI道具、8小游戏、6角色，全部结算。
- 最终APK41项Android15原生检查；完整记录android-smoke-report.json。末项模仿动作第一次因测试重复测量几何和读取全部历史而错过时机；android-pose-resume.cjs缓存位置、缩小读取后在同一APK完成最后2项，未修改游戏代码。前39项和输入轨迹随包保留，验证报告明确记录continuation。
- 飞行模式、Wi-Fi/数据关闭、无默认网络下冷启、3161精灵、音乐、ADB继续存档全部通过；android-offline-report.json。网络已恢复。
- 19828包内文件匹配dist；最终原生、离线和交付APK的哈希相同。
- 所有QA已结束；Vite5178和专用DingdangTest/emulator-5580可能仍运行。不要将旧version31或更早APK当作交付文件。

## 本轮关键更改

9501幅PNG无损合并8图集，逐张RGBA核验；16并发加载，解决数千图片请求导致启动超过30秒。原图保留，绘制保留原尺寸/偏移。
时光机id33曾被误判为缺安装资源而禁用。本轮REA确认Database是原版自动生成的六槽历史，已补新局/完整玩家循环滚动保存、填满后的自然抽取、全状态回溯、当前RNG保留、清空旧历史及消息后恢复ready。手机续玩会保存历史，旧移动端存档迁移历史为空。详见docs/rules/TIME-HISTORY-28.md。
此前已实现八图、六角色、42道具、8小游戏、35仙人事件、掷骰/半格/岔路/中途设施、地产/特殊建筑/商店/矿山、铃铛/月结/破产胜负、存档、原音频、角色/伙伴/地图/施放动画。规则27修复出口、税顺序、破产army、小游戏暂停写盘、小矮人沉睡本体、分身、胖虎相遇、特殊区域等，均已验。
独立移植的AI权重、RNG、触屏布局/镜头/部分演出衔接不同，不能读PC存档。尚无用户实体手机结果。不宣称原EXE逐帧/逐指令完全一致。

## 逆向和工具

REA已关闭：rea-analysis/wa.exe-ec35d2f7d4b2e39f/ghidra-rules28-history.snapshot.json（7332094字节，224证据/189工作流）；historyXrefs28、history28、historySave28已写research；project.json状态complete。
源exe work/哆啦a梦大富翁/Dora/wa.exe SHA256 f190b35370d3efe3024b5105a90f85abf07f5915e7b7a431d93b756de03f65f3。D盘原件未改。不要启动原Windows GUI（先前审批拒绝），静态分析/隔离x86及专用安卓QA可用。无git/AGENTS，不自行派子代理。
构建 ./tools/build-android.ps1 -Offline -InternalOnly；交付打包工具tools/package_delivery.py会核验所有报告与APK哈希后复制，拒绝覆盖不同哈希的既有交付文件。
Python C:/Users/lxx/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe，PYTHONPATH tools/_deps；SDK F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk，JDK项目.toolchain/jdk-21.0.13.0.2+1。

2026-11-03 选人后续：已增加 pc-selection.ts，以 bitmaps[54] 场景调色板提取选择背景、六个候选精灵和分玩家配色头像，替换可见下拉框为触屏角色选择。仍使用隐藏 select 保存配置以复用校验。四玩家可点击定位、切换真人电脑，重复选择在操作时拦截；地图/局长暂仍原表单。build通过，tests/pc-selection-ui.cjs四组触摸/重复校验/开局掷骰/冷恢复通过；截图 test-results/pc-selection-portrait.png 和 landscape.png。这是原美术的响应式触屏布局，未声称原选人动画/位置完整还原，未新打APK。

2026-11-03 rc2：用户要求继续直到可交付。已新增 pc-map-choice.ts 八图触摸预览，版本1.0.0-rc2/versionCode33构建成功。APK 220366516字节，SHA256 4f3251f14963a1c6988dede23b90914f826ef82f30bbd0d4443ddc4493221e3b；Android15 emulator-5580已安装，tests/android-front-rc2.cjs四项原生触摸/冷恢复通过，25项flow-ui通过，正在最终包资源校验。tests/flow-ui.cjs负向重复角色用隐藏select注入配置，真实触摸在pc-selection-ui和android-front-rc2验证。交付脚本tools/package_front_rc2.py绑定新报告与哈希，仅标注为UI测试候选，不声称完全还原PC。仍欠原版骰子/棋盘呈现、完整主菜单及新PC数据迁移，用户的完全还原目标未完成。

rc2最终校验已通过：19913个包内文件逐一匹配dist，交付目录 releases/1.0.0-rc2 已生成APK、SHA256、绑定验证JSON及安装/已知差异。此为可安装测试候选，并非用户要求的完整忠实移植已完成。

2026-11-03 roll30：新PC 0x43c8eb确认步数演出使用sprite2[2,75..78]蓝色终点标记及77/78音效，而非interface动画或字体骰面。新增roll-preview.mjs、extract_pc_roll.py，main.ts接入终点闪动、数字提示；删除误用标题语音。证据research/v121-roll-*.json，说明docs/rules/PC-ROLL-30.md。类型检查/Vite构建、音频4项、落点2项通过；flow-ui正在运行（exec session44226），不要使用旧report冒充新结果。未新打APK。REA close返回No app is open，未生成roll快照；关键原始证据已经文件保存。

roll30流程回归结束：25项全部通过，最新test-results/pc-front/flow-ui-report.json。截图dice-before-walking.png已目视确认蓝色终点落格和数字提示。APK仍为历史rc2，新源码未打包。

rc3交付已生成：releases/1.0.0-rc3/DingdangTouch-1.0.0-rc3.apk，versionCode34，220369820字节，SHA256 a55a7f1ea000affcb8fd606ffa3b53a90e58801926d92fca3f853b391196c675。175规则测试、25浏览器流程、4安卓触摸及冷恢复通过，19919包内文件校验通过。已安装QA模拟器。仍为可测试候选，完整原作还原未完成，具体差异随包说明。

2026-11-03 rules31未打包：新版maps-v126八图/59格及商店配置已接入，新局pc-v126、旧档legacy隔离，PC-MAPS-31.md记录。24局120天全部通过；修复缩小到期半格仍按整步走及转弯导致落非道路。176规则测试全过，相关11测试全过。flow-ui因新旧图异步切换暴露测试等待读档不足，已统一等active，最新session21842运行中。新增runtime-touch/input.mjs及2测试，未连接原引擎。子agent评估及资产盘点research/VM-TOUCH-ASSESSMENT.md；建议Wine/x86+专用触屏层，暂无ARM真机或运行时资产。已异步询问用户手机型号/成功Winlator版本/可连接设备，继续时先检查回复。D盘原包82文件哈希清单runtime-touch/original-manifest.json，仅读取未执行。

用户最新约束：拒绝使用Winlator成品，至少外观为独立手机App。已向子agent vm_touch补充要求并继续调查独立APK内嵌组件源码/构建路线。runtime-touch/PRODUCT-CONTRACT.md固定无需外部Winlator、容器、桌面的交付体验。新增gestures.mjs及测试，4触屏测试通过，原版未启动。新版地图预览已改maps-v126。最新pc-title-ui三项及tsc通过。此前flow-ui报告21:26:33为passed（session21842已结束）；本轮重跑起初因Vite停机失败，已恢复5178，避免误标为代码错误。

用户指定RA2 VM框架：已定位ra2-games/ra2，子agent报告research/RA2-VM-REUSE.md。固定commit fc4dd415628216e21e09e80d233ba228692b12dc官方codeload归档下载成功，解压research/ra2-vm-audit/ra2-同commit；已读AGENTS，未改上游。两次git clone失败，不要继续等待。无需Windows镜像，v86+定制固件+Win32/DirectX可作为独立APK内核候选。导入契约runtime-touch/ra2-vm-requirements.json共162入口/11DLL，静态词法覆盖research/ra2-import-coverage.json（只词法不代表实现）。未构建或运行VM，仍需DirectInput/WINMX/AVI/GDI适配与CPU工具链。

2026-11-04主agent：RA2 VM锁定依赖安装成功94包（ignore-scripts），本地pnpm11.24置.toolchain/pnpm-11.24/package，使用Codex node24.22.1；系统node20不适配该工具。buildV86.mts实际执行失败于cargo ENOENT，尚缺Rust wasm/clang/make。未跳过CPU补丁冒充成功。runtime-touch/resource-provider.mjs新增GameFileProvider形状的只读原资源+持久化覆盖层，2测试通过（空档、失败重试、并发写入）。尚未接入上游。子agent vm_touch负责runtime-touch/directinput独立模块及原版调用证据，勿重叠修改。

2026-11-04构建突破：工作区Rust1.99.1+wasm32已装.toolchain/rustup,cargo；LLVM-mingw20261020便携解压.toolchain/llvm。固定v86源码解压.toolchain/v86-source/v86-847e34d...，已apply RA2 single-step补丁。tools/build_v86_windows.py按上游Makefile生成6表/clang编译softfloat,zstd/cargo；Windows linker wrapper tools/v86_link.py移除stack-first并加no-stack-first。release WASM编译成功，已以新inode替换RA2 node_modules/v86/build/v86.wasm。relay-package build:lib成功，vitest debugger.e2e.test.ts真实VM5项全部通过。上游buildV86.mts缓存marker未写，不可运行常规build使其再次要求Linux make；应补Windows构建集成。DirectInput子agent完成guest-driver及poll-tap，主agent14项独立测试通过，尚未接VM。所有原游戏仍未启动。
`n2026-11-04 原版首次真实VM启动：162导入ABI加载完成，CRT启动已执行，原EXE未经修改在v86运行，首个真实阻塞 USER32.DLL!FindWindowA，0帧，详见test-results/doraemon-vm/boot-report.json。不能宣称启动成功。DirectInput合成x86 COM调用2项已通过，vm_touch正接生产shim；dora_abi实现FindWindowA并补独立配置；vm_build接Windows可复现CPU构建。boot诊断测试位于上游tests/real-game/doraemon/boot.test.ts。用户已明确授权子agent并行，替代历史不得自行派agent注记。

2026-11-04 继续：FindWindowA字符串真实窗口查找已完成单测，原版越过GetProfileStringA后到DeleteFileA，仍0帧。生产DirectInput COM接入，触屏controller/x86回归由input_integrate继续。Windows CPU真实构建/cache已接通；pnpm11.24子进程shim在.toolchain/pnpm-bin，PATH需该目录+node24。首次完整check 1300pass/37fail（9suite），test-results/ra2-vm-check.log，build_integrate修环境和cache测试，不可标全过。boot首次画面门槛新增16实际颜色，避免清屏误通过。




