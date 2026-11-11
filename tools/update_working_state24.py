from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
(r/'docs/WORKING-STATE.md').write_text('''# 开发断点（2026-11-03，规则24）

目标：完整原版 Android 触屏移植。用户要求做完后交付，不能把内部APK作为完整版。当前仍未完成。

源码 0.3.0-dev / town-flow-24。八图、六角色、八款小游戏；32/42道具已接入代码。独立引擎读取原资源，不依赖 Winlator。

## 已落实

- 八款小游戏：真人触屏、AI、计时、奖励、暂停、冷启动，各有原EXE指令fixtures。
- 道具：0、1、2、4、5、7、9、10、11、12、13、15、16、17、18、19、20、22、23、25、26、27、28、29、30、31、33、34、36、37、38、39。最新7/17/26的触屏/原指令对照正在验证，不能把代码接入当作验收完成。
- 月末利息、地产和步行奖励、物价上涨、日期转换仪；颠倒笔和处境掉换枪；任意门与大炮。
- 35种仙人元数据，34种在所提供文件中可选（时光机事件要求缺失的Database00XX.dat）。多种持续状态、好坏概率、补偿、群体事件、商店折扣、矿山关闭、小游戏去重池。构造器/掩码/计时有210组x86对照；应用分支尚未全部逐条oracle验证。
- 幸运枪全部1000种原随机输入核对；倒霉咪表。缩小的半格移动、存档和显示；496条半格导航原指令样本。竹蜻蜓基本能力门控。
- 咒语相机单次反射（交换布/处境掉换枪/朋友圈不反射），恶运钻石单人坏事件转移，睡意枪两阶段选择。
- 2249音频资源、十首音乐、普通话/粤语、独立音量、暂停后台与续玩。

## 实际验证版本

- 最新通过完整安卓回归的APK为versionCode23、规则22：31项检查通过，0页面错误。包含八款小游戏实际ADB操作、完整计时、冷启动、奖励，音频/语言/后台桥接。报告 test-results/android-version23-rules22-report.json。SHA256 f3e301302c08551ba77ef6298f638fbef19bc3bd6552cfa5c054f5a83006c1af。
- 源码24之前主流程浏览器25项/月结2项通过（尚不含最新7/17/26）。最近132项Node回归131通过，一项测试构造了原冲突表不允许的状态，已修测试，待重跑。源码24构建通过。后续以新报告为准。
- 无安卓真机验证。当前dist24不能与旧APK22做一致性比较。

## 未完成，下一步

- 新增7/17/26原指令fixtures和触屏回归；睡意枪oracle工具 tools/verify_original_targets.py 正在调试相机UI桩。
- 其余10道具：3、6、8、14、21、24、32、35、40、41。军队8触发内部42睡眠；反射/冲突/取消与动画要完整。
- 铃铛生成拾取、分身/隧道/特殊建筑、地图特有事件与演员；完整道具动画及对应声音。
- 半格导航普通大小转弯距离门槛、门侧入连续移动、竹蜻蜓和半格落地的全部事件门控；小状态替换时恢复标记需审查。
- 仙人实际效果更多x86对照，炮台税特殊钻石分支；角色相遇保护/能力规则。旧单次护身符兼容。
- PC存档兼容、长期全内容对局、最终APK重新构建与全回归。

## 工具和证据

原版工作副本 work/哆啦a梦大富翁/Dora/wa.exe，SHA256 f190b35370d3efe3024b5105a90f85abf07f5915e7b7a431d93b756de03f65f3。D盘原件未修改。
REA Ghidra12.1.4 已关闭并保存 ghidra-rules24-targets.snapshot.json（149证据、125工作流）。需要继续逆向时用此快照重开，旧16快照已过期。research下证据已落盘。
原版GUI启动曾被自动审批拒绝，不重试；静态REA和隔离Unicorn可用。
模拟器 DingdangTest / emulator-5580；Vite5178。构建 tools/build-android.ps1；Python C:/Users/lxx/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe；依赖 tools/_deps。
''','utf8')
p=r/'docs/FULL-GAME-ACCEPTANCE.md';s=p.read_text('utf8');start=s.index('当前源码');end=s.index('\n\n## 实施顺序',start);s=s[:start]+'''当前源码 0.3.0-dev / town-flow-24 仍未达到完整交付要求。八图、六角色、八款小游戏、32种道具、月结及音频已接入代码；最新转移道具正在验证。其余10种道具、铃铛、地图特有事件、部分角色互动与完整特效尚未完成。规则22内部APK已通过31项安卓回归；它不包含最新源码24，不能作为完整版供测。详见 WORKING-STATE.md。'''+s[end:];p.write_text(s,'utf8')
p=r/'docs/rules/AUDIO.md';s=p.read_text('utf8').replace('0x4450e5商店7，0x4455c6仙人8','0x4450e5矿山7，0x4455c6道具商店8').replace('0x4455c6仙人入口bank0/13','0x4455c6商店入口bank0/13；仙人保留棋盘音乐，月结音乐9').replace('此修正原生验证进行中。','versionCode23的31项原生回归已验证修正：onPause使用WebView直接dispatchEvent，避免桥接初始化过早丢事件。');p.write_text(s,'utf8')
p=r/'rea-analysis/wa.exe-ec35d2f7d4b2e39f/project.json';j=json.loads(p.read_text('utf8'));j['next_step']='Rules24, 32/42 items integrated; verify sleep/camera/diamond, then remaining10 items, bells, map actors, original animations and full native QA. Android version23/rules22 passed31. REA closed, latest ghidra-rules24-targets.snapshot.json. See docs/WORKING-STATE.md.';p.write_text(json.dumps(j,indent=2,ensure_ascii=False)+'\n','utf8')
