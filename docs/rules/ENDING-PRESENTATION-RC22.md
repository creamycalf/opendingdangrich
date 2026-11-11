# RC22 月结与 GAME OVER 原演出

本轮二进制均为新PC `work/new-pc-v121/Doraemon.exe`，SHA256 `b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1`。使用REA/Ghidra12.1.4静态反编译及Capstone读取常量，没有执行原EXE，也未将浏览器截图称为原PC录像。

## 已证实流程

- 月结入口475a8d曲9，483140构造→4832a8准备明细。Bitmaps119为四座位背景；Sprite2 304+角色为有效领奖头像、311+角色为无效头像，433+座位×7+角色为最高建筑图。地产业绩、数量、步行、利息、总额来自既有引擎结算rows。
- 通用入场486793/486925从y480上升，速度(480−目标)/15，再按sin(i×3.14159/5)播放30采样衰减抖动；碰撞SFX14。明细确认后向上退出。提前领取分支直接返回，不进结果页或播放曲10。
- 普通结果483d4c以严格大于比较选总资产领先者，同分保留先座位。背景按角色基数[68,76,64,80,84,72,54]+座位，黄耳固定54。Sprite2柱461+座位、底板465+座位、人物469+角色。4849aa每tick增长4像素，目标216×资产比；结果曲10。净资产、矿山、现金等均显示已提交值，不在演出重复结算。
- GAME OVER仅对应AI/无人真人获胜路径473ca6，曲6单次；Bitmaps121调色背景，Sprite2 550～557八字母。x=[1,81,158,253,337,424,499,568]，起始y为−44−10×序号，每tick+10至186，再读取19点sin(i×6.28/19)×4+186取整波形。首字母counter194切全体循环，204回186；稳定后点击可返回标题。曲4的真人胜利不能误套这个画面。

新增证据：research/rc22-monthly-setup-4832a8.json、rc22-monthly-result-483d4c.json、rc22-monthly-draw-4849aa.json、rc22-monthly-panel-486793.json、rc22-monthly-panel-486925.json。GAME OVER全函数复用docs/audits/v126-ending-audio-rea.json；补读常量research/rc22-ending-native-constants.json，含源SHA、表地址对应值与fsin指令定位。资源提取器tools/extract_ending_scenes.py读取工作区原版副本，产物catalog记录bitmaps.dat/sprite2.dat各自SHA。

## 集成接口

- `mountMonthlyPresentation(host,{rows,players,totals,converter,onStage,onSfx,onDone,signal})`：totals为四人**结算后**总资产；onStage('intro')选曲9，onStage('result')选曲10；onSfx(id)播放已证实14；onDone由根执行已有answer/ok。返回Promise<{dispose,snapshot}>。
- `mountGameOverPresentation(host,{onDone,signal})`：根控制曲6和返回标题；只用于非真人首胜。返回同样生命周期对象。
- 加载成功才挂载，资源失败reject且不留下半成品DOM；signal可阻止迟到挂载。主动dispose、dialog close、DOM移除都停止RAF；visibilitychange和dingdangPause/Resume冻结/恢复演出。不保存或改变游戏财产、胜负、随机数。
- 主流程应保存已提交结果后再展示；中断读取时重播演出本身不会再次发钱。宿主关闭或被替换必须dispose/abort；结束时清除临时audio.scene覆盖。

## 适配与边界

原位图、原色板、人物、柱体和字母使用原资源；金额字体使用浏览器可读字体，按钮为44px触屏控件，这两项明确为手机适配，不称逐像素复刻。30Hz是当前移动端演出tick；衰减抖动采用已证公式，原状态机门控前后可能有额外一帧，未经原PC录像逐帧比较。原负资产全员≤0时可能访问无效winner，本实现安全选择首个存活者；负柱高限制为0。

真人胜利46f0e8的后续补齐见下节。Windows签名输入/打印交互继续由手机证书组件承接，不声称原GDI打印对话、调色板循环和全部操作延迟逐帧一致。

## 验证

`node --test tests/ending-presentation.test.mjs`3项通过：字母1000tick有界/32tick切循环；月结同分/淘汰/黄耳背景；入场与4px柱高。

`node tests/ending-presentation-ui.cjs`4组通过、页面错误0：真实Chrome原资源画布及触屏，月结明细→排行、提前领取跳过排行、GAME OVER一次结束、原生pause/resume事件冻结、dialog关闭停止RAF。3张截图已目视，报告位于test-results/rc22-ending-components。TypeScript检查通过。这是独立组件验证，主流程和最终APK集成验证由根任务另记，不混写为已经验证。

## 真人胜利与原片尾补齐

`research/rc22-human-ending-46f0e8.json`完整证据：Bitmaps123背景；Interface50彩球与52垂带、51循环彩纸，Sprite2角色400+id在(191,81)。入口先等待确认，放行50、52延后5tick；50结束开Interface53+座位并置于(0,362)。该动画35帧发0x806f通知，原函数冻结并建立建筑成绩条。条带从x−640每tick+10进入，展示5类建筑计数与Rank；确认后继续右出再滑入总资产/天数条；再确认退出条带，恢复原座位动画36～71帧，随后进入签名证书。

`docs/audits/v126-ending-followup-rea.json`的470dc9对应0x118：Bitmaps172提供色板，随后432541清屏为色板索引0（黑色），不能将321×23原位图铺满屏幕。黑底播放Interface66，初始延迟35tick；DAT原记录1520帧，完成通知0x65后点击回标题。无换曲调用，继承曲4。此次实现真实原片尾资源，不用自绘感谢文字替代。清屏指令补核research/rc22-afterword-clear-432541.txt。

资源`tools/extract_victory_scenes.py`→`assets/victory-scenes/catalog.json`（8段Interface动画、279张引用Sprite1精灵、角色/建筑/Rank等Sprite2原图；catalog记录4个原档SHA）。

API：`mountVictoryPresentation(host,{certificate,onSfx,onDone,signal})`交出片头/成绩流程，onDone后根展示现有签名证书；`mountVictoryAfterword(host,{onDone,signal})`展示原片尾，onDone根返回标题。保持曲4，不额外发奖或写胜负。certificate字段沿用character/seat/name/grade/assets/days/buildings。两组件同样加载前不挂载、支持AbortSignal与dialog close完整dispose，后台暂停，数字使用手机可读描边字体。

`tests/victory-presentation.test.mjs`2项通过，覆盖原50结束、四个座位35帧0x806f标记、两个640px条带和后半动画顺序、真实精灵存在与原SFX100。实际浏览器完整片尾测试另存`test-results/rc22-victory-components/`。

黄耳例外已证实：46f0e8 case9检查角色ID6直接跳case0x1e→0x118，跳过普通签名/证书打印。根应将黄耳胜利片头onDone直接接原片尾，其他六角色接证书后再片尾。

真人组件最终实际浏览器3组通过、错误0：原开球/座位成绩/资产两条顺序和SFX100只一次；完整播放1520帧原片尾（含35tick前延迟）及暂停恢复后可返回；关闭dialog取消片尾且不触发迟到完成。最终黑底GAMEONE片尾截图与白色描边金额已目视，生产主流程仍由根独立验收。

## 生产主流程触屏验收

`tests/rc22-ending-production.cjs` 在生产 dist（index-w1VYBjhy.js）、915×412 Chrome 独立存储使用 CDP touchStart/touchEnd 实际点击，5组通过、page/audio错误0。普通月结9→10两页、提前领取只有9，保存退出/继续与确认后现金、存款、步数、领取标记均不重复结算；AI字母结局6回标题2；真人原开场/两页→S级证书→完整1520帧片尾→标题；黄耳胜利直接片尾而无证书。重复打开结局后榜单及解锁存储逐字一致。截图与报告位于`test-results/rc22-ending-production/`，证书和月结画面已目视，低高度屏通过滚动可触达保存/继续。

同脚本`QA_RACE_ONLY=1`延迟catalog响应1.8秒后触摸保存退出，迟到资源不再插入主菜单、曲2及存档金额保持正确，`race-report.json`通过。三个组件对延迟close事件仅在dialog实际已关闭时dispose；独立组件快速close→show测试通过，真正关闭仍移除canvas。此次仅浏览器生产验收，未据此声称RC22最终APK已验收。前两次生产试跑真人fixture角色/name不匹配导致存档校验拒绝，已修正并加入E.restore预验证；失败试跑不计通过。

随后按短横屏要求改进原演出布局：原画布保持4:3并适配剩余屏幕高度，保存与演出继续按钮同底行44px，标题保留无障碍语义；无需滚动。最新生产dist运行`QA_LAYOUT_ONLY=1`，640×320、915×412、320×640三尺寸全部通过：dialog无纵向溢出、画布完整且比例正确、两按钮均处于视口内并同行，实际触摸完成两页月结。`layout-report.json`及对应截图已保存，640×320与320×640已目视。只重新验布局，未重复播放先前已通过的完整片尾。

## 最终 APK 原生验收进展

已安装 code53，SHA256 `9bcda2bee8183fb893a1d709ce43a7d46ad45b322ffae5350d638a7ff59bee7b`。`tests/rc22-ending-native.cjs`独立通过普通月结9→10/确认不重复入账、AI原GAME OVER曲6→标题2两组；每组均恢复原生GameSave及全部localStorage并reload再次逐字核验。ADB surface截图原图可见；月结canvas采样19200个非透明点、117色，DOM292×219、内640×480。先前CDP截图漏掉canvas层不作为原生视觉证据。

真人初次曾推进至banner-out，但15秒内未进入证书，同时模拟器/CDP出现全局迟滞；该轮未通过，存档已恢复。root诊断专用模拟器运行54小时后系统CPU91%（kernel68%、softirq21%），正常冷启动且不清数据后恢复。随后仅补真人组通过：原开球/建筑条/资产条→原证书，gate加载2.035秒，assets-out到证书3.625秒，资源无胜利图片失败；ADB证书图已目视。此次三组均已通过，最终存档及全localStorage恢复并reload二次核验，备份删除后交接下一代理。失败尝试仍保留`retry-attempts.json`、`last-failure.json`，最终性能时序见`human-progress.json`，不将失败试跑算通过；原生未重复完整50秒片尾（浏览器已完整验证）。

### 有界图片加载修复后的最终包复验

上段旧包结果已保存在`before-loader-fix.json`。2026-11-09 17:52对新APK SHA256 `d9024e89a333784eea98c62bec666e695a8ea4001d6242c7fdba607f9e4da2ed`实际重跑全部三组，同轮通过、page/audio错误0，不沿用旧hash结果。真人gate加载1.276秒、assets-out到证书3.435秒，原生证书截图已目视；月结canvas仍19200非透明采样/117色且实际两页可触摸继续，金额不重复。`report.json`记录新hash并标记三组全部通过、存档恢复及reload复核成功；私有备份已删除，模拟器已交给board_fix后续验收。
