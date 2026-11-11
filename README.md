# Open Dingdang Rich · 叮当大富翁

Android 触屏版的独立实现源码。包含游戏逻辑、界面、测试和本机资源提取工具；游戏素材需自行从拥有的PC版准备，本仓库不包含原游戏安装包、音频/地图素材、APK或用户存档。

## 构建

1. 安装 Node.js、JDK 21、Android SDK 35。
2. 将已提取的游戏资源目录放入 `app/public/assets/`。提取与规则依据见 `tools/` 和 `docs/`；工具中的本机路径需按环境调整，当前并非一条命令即可导入任意PC版本。
3. 在 `app` 目录执行 `npm ci`、`npm run build`、`npx cap sync android`。
4. 在 `app/android` 配置本机SDK路径后执行 `gradlew assembleDebug`。

新桌面图标由图像模型生成，原稿和复现说明见 [图标记录](docs/design/launcher-icon-generation.md)。

下方为本机开发历史；其中安装包、原始分析与测试结果路径不随源码上传。项目尚有与PC版不同的表现及未验证组合，详见 [当前差异](docs/audits/RC24-PC-FLOW-AUDIT.md)。

---

最新交付：[叮当大富翁 RC24](releases/1.0.0-rc24/DingdangTouch-1.0.0-rc24.apk)，同签名覆盖安装保留存档。本轮减少胜利/仙人场景图片读取与地址处理开销；同机模拟器实测胜利加载9.35→4.55秒，仙人12.75–13.95→4.22–4.51秒（不含原入场动画）。补小矮人首次接管睡眠身体的原60帧方向动画，保存重载不重复。最终APK结局、仙人好坏箱真实后台恢复和接管演出均通过；无实体ARM测试，余下差异见[RC24核对记录](docs/audits/RC24-PC-FLOW-AUDIT.md)。VM仍RC11。

历史交付：[叮当大富翁 RC23](releases/1.0.0-rc23/DingdangTouch-1.0.0-rc23.apk)，可同签名覆盖安装保留存档。补月结、结局、证书和标题图片的加载/取消保护，以及仙人后台计时与旧音效清理。最终APK月结/两种结局、仙人好坏箱真实HOME前后台和存档恢复已通过；原版规则未改。模拟器部分场景首次/重载素材需约10–18秒，仍待优化；原版功能与真机验证的剩余事项见[RC23核对记录](docs/audits/RC23-PC-FLOW-AUDIT.md)。VM仍RC11。

历史交付：[叮当大富翁 RC22](releases/1.0.0-rc22/DingdangTouch-1.0.0-rc22.apk)，同签名覆盖安装保留存档。补原版月结两阶段、胜负结局/片尾、仙人完整演出和持续状态图、分身等道具退出、矿山存取款现金演出；修复安卓仙人图片加载卡住及短横屏结局按钮布局。最终APK已验证月结、两类结局、仙人好坏分支/状态点查、分身/竹蜻蜓退出及矿山取款重载，349项规则/输入回归通过。完整50秒片尾在浏览器验证；实体ARM尚未验证，其他剩余差异见[PC流程复核](docs/audits/RC22-PC-FLOW-AUDIT.md)与[交付记录](releases/1.0.0-rc22/verification.json)。VM本轮未改，仍RC11。

历史交付：[叮当大富翁 RC21](releases/1.0.0-rc21/DingdangTouch-1.0.0-rc21.apk)，可覆盖安装保留存档。点击地产的黄框不再压住人物；仙人改原图宝箱选择、开合箱和音效；租金、买地升级及奖励/罚款补原豆沙包动画。额外修复地图标牌漏画、静态图锚点及高楼裁剪。最终APK已验证好坏宝箱、现金绘制与存档恢复；完整流程的证据与剩余差异见[PC流程复核](docs/audits/RC21-PC-FLOW-AUDIT.md)，详细验收范围见[交付记录](releases/1.0.0-rc21/verification.json)。不能以测试数代表与PC全部一致，尚无实体ARM验收。VM仍RC11。

历史交付：[叮当大富翁 RC20](releases/1.0.0-rc20/DingdangTouch-1.0.0-rc20.apk)。本轮修复连续购物、滑动商店/口袋、竞速真人离屏反馈、未来地图升级黑剪影和空地基图层，补道具/地格说明，重做图标及应用名称。322项回归、42道具触屏、497地产原生朝向及最终APK触屏验证通过。[交付范围](releases/1.0.0-rc20/README.md)。以下保留历史记录。

历史交付：独立版 [RC19](releases/1.0.0-rc19/DingdangTouch-1.0.0-rc19.apk)。补选人语音、无法收租对话、胜负/小游戏计分/月结音乐，修正“再玩一局”音轨切换及单次音乐被触摸重播。318项回归、最终APK八组场景音频触屏及七组道具回归通过，资源/签名核验通过。可覆盖安装保留存档；[交付说明与边界](releases/1.0.0-rc19/README.md)。VM仍RC11。以下为历史版本记录。

RC18：[安装包](releases/1.0.0-rc18/DingdangTouch-1.0.0-rc18.apk)。修正导弹反射消耗相机、全体缩小重复叠加、监狱目标区域判断，并补小游戏结算语音。311项回归、八图24局长局、最终APK七场景通过；详细范围见 [交付说明](releases/1.0.0-rc18/README.md)。

最新修复包：独立版 [RC17](releases/1.0.0-rc17/DingdangTouch-1.0.0-rc17.apk)，原引擎版仍为 [RC11](releases/vm-0.9-rc11/DoraemonOriginal-0.9-rc11.apk)。本轮逐项核查42种道具，修正幸运枪概率、睡意枪来源限制、小矮人/竹蜻蜓互斥，以及交换布/处境掉换枪清除目标状态。302项规则与输入回归、42项道具触屏、最终APK的6项修复场景通过。见 [逐项核查报告](docs/audits/PC-V126-ITEMS-2026-11-07.md) 与包内 verification.json；未穷尽所有叠加组合，暂无ARM真机结果。以下版本均为历史说明。

当前独立触屏修复版：`releases/1.0.0-rc15/DingdangTouch-1.0.0-rc15.apk`。商店原图/说明及小游戏准备/继续入口已补齐，测试范围见该目录 verification.json。原引擎修复版：`releases/vm-0.9-rc10/DoraemonOriginal-0.9-rc10.apk`，已实测人物气泡继续和后续掷骰；性能限制见 acceptance.json。以下保留历史版本说明。

# 叮当大富翁 · Android 触屏版 1.0.0-rc1

独立引擎运行本机原版资源，不依赖 Winlator。当前为完整内容的交付测试候选：八张地图、六名角色、42种道具、八款小游戏，以及掷骰走路、岔路、地产经营、矿山存取款、商店买卖、铃铛、仙人、月结、破产胜负、存档和原作普通话／粤语音频。

道具不再只有按钮或文字占位，全部可实际施放；小游戏可操作、计分、发奖并回到棋盘。移动中经过商店/矿山可办理业务后继续剩余步数，租金在停靠时结算。支持原角色行走/站立/飞行/睡眠/缩小、分身和机械小矮人、五类跟随伙伴、原地图动画及道具施放动画。

## 安装与操作

已验收的安装包为 releases/1.0.0-rc1/DingdangTouch-1.0.0-rc1.apk（约210 MiB）。同目录有安装说明、SHA256和验证记录。将APK复制到手机，点击安装；已有同签名旧版可覆盖升级。不要卸载旧版后再装，否则Android会删除旧存档。

点红色太阳掷骰，岔路点方向或目标道路。拖动地图、双指缩放；定位按钮返回当前角色。道具代替本回合掷骰，目标和建筑直接触摸选择。小游戏使用画面下方的大按钮。暂停菜单可保存退出、调整动画速度及音乐/音效/语音；主菜单“继续游戏”恢复自动存档。

## 验证和原版依据

规则证据来自work副本wa.exe的静态REA及隔离x86执行，保留在research、rea-analysis和tests/fixtures。源码规则标识town-flow-28。功能测试和原代码对照分别记录，不将自测等同于原版逐指令一致。

最终记录见 docs/ANDROID-VALIDATION.md、docs/FULL-GAME-ACCEPTANCE.md 和 test-results。24局八图长局覆盖6角色、8小游戏和40种AI道具；另有42件道具逐件触屏/动画/回放测试。没有用户手机的真机结果。

已知差异：这是独立移植，不是运行原EXE；AI决策权重和随机数实现不同。触屏布局、镜头与部分动画衔接经过适配，不保证逐帧相同。PC版存档不能导入。时光机事件使用六份滚动历史回溯，手机续玩会保留历史，触发回溯后清空。未上传或公开发布原游戏资源。

## 开发

    npm --prefix app ci
    npm --prefix app run dev -- --port 5178
    npm --prefix app test
    npm --prefix app run build
    node tests/flow-ui.cjs
    node tests/all-items-ui.cjs
    node tests/full-game-soak.mjs
    ./tools/build-android.ps1 -Offline -InternalOnly
    node tests/android-smoke.cjs

浏览器测试需5178开发服务。安卓测试仅操作专用DingdangTest/emulator-5580；InternalOnly构建不会覆盖releases。工具链路径见docs/WORKING-STATE.md。

原始输入在originals和work，D盘原件未改。格式调查参考doraemon-monopoly-localization，架构参考rich4-renew-app；未引入其运行时代码。源码授权不代替原素材权利。
