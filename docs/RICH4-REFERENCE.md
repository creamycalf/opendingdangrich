# rich4-renew-app 对叮当大富翁触屏重制的参考价值

2026-11-01；源码检查固定到提交 `25ebbb9a2692319a3baa3ebe47775c8d0c293300`。
目录通过 GitHub API 获取，truncated=false；选取的十份源码及 API 返回保存在 research/rich4-selected。完整 clone 网络停滞，已中止。本次没有运行它的 App、下载游戏素材或执行它的测试。

## 结论

参考价值高，能够作为架构和移动交互的样板，不能作为直接换素材即可运行叮当大富翁的通用引擎。用户目标明确为手机触屏重制；不再以 Winlator 容器或虚拟鼠标为交付方向。

项目 README、package.json 和实际源码共同支持：它依据大富翁4逆向成果重建 TypeScript 游戏，Canvas 2D 绘图，HTML 按钮／面板交互，Vite 构建，Capacitor 包装 Android／iOS。这里“手机 App”不意味着 C++/Java 全原生渲染；关键是重写引擎、直接处理触摸事件，不依赖原 Windows EXE。

## 已读代码及用途

| 文件 | 实际观察 | 对本项目的价值 |
| --- | --- | --- |
| game/src/core/flow.ts | Generator 产生事件和问题，由外部送入 Answer | 规则与界面解耦：买地、道具选目标等决策不依赖桌面窗口 |
| game/src/ui/board-view.ts | Canvas 2D；Pointer Events、指针捕获、点击与拖动区分、输入状态限制、世界坐标变换 | 地图拖动、动画期间防误触、可选择目标与浏览地图的模式划分 |
| game/src/ui/pick-hit.ts | 不透明像素、附近像素、地面高亮、包围框等分层命中；重叠对象返回候选栈 | 给手指增加容错；相邻或重叠角色可明确选择 |
| game/src/ui/controls.ts | DOM 工具按钮；GO 在 pointerup 触发、处理 cancel、防止重复回答；骰子 DOM 仅变化时更新 | 防止按钮动画／重绘吞掉点击；一次操作只执行一次 |
| game/src/ui/orientation.ts | Capacitor 横屏、竖屏及自动方向控制并保存偏好 | 手机方向支持；具体布局仍要重新设计 |
| game/src/ui/mem-tier.ts | 地图、精灵、动画、音乐分档内存预算 | 按需读取资源，控制解码内存，不一次展开全游戏 |
| game/src/ui/screens/mini-games.ts | 独立小游戏 Canvas 输入；触屏射击扩大命中范围、拖动控制接物位置 | 小游戏要按玩法改输入，不能只为整款游戏添加一套通用手势 |
| docs/rules/README.md | 分模块记录逆向证据、原版问题、保留／修改决定；文档也明确有待实测推测 | 建立可追踪的规则台账；不能将文档或测试存在当作全部行为已验证 |

特别核查：board-view 的 bindInput 仅按单指／双指中点平移；记录 dist 和 zoom 但没有在 pointermove 中用双指距离改变缩放。存在内部缩放和全图切换，不等于已有捏合缩放。本项目需要自己定义缩放锚点、边界与点击冲突处理。

## 能借鉴和不能替代的部分

- 可借鉴：工程分层、资源清单、地图相机、触屏命中与消歧、按钮状态、移动存储／方向接入、缓存预算、规则测试方法。
- 适合独立实现或解耦后复用：命中测试、手势状态机、通用缓存及保存接口。BoardView 已耦合大富翁4模型和扩展玩法，直接搬来更换资源并不划算。
- 必须重新实现：GameOne 格式加载、地图格与道路含义、叮当角色动画、地产／道具／事件／AI／小游戏规则、语音触发和存档。
- 大富翁4逆向基础来自 mytbk/rich4；其 MKF 解压和 EXE 函数地址不适用于本机 GameOne 数据及 wa.exe。
- 项目声明 GPL-3.0-or-later；如实际引入代码须保留并按该许可处理。原游戏素材不属于该源码许可。此轮仅研究、未并入应用代码。

## 建议的实现结构

```text
tools/extract         GameOne 资源解析 → 图片/图集/音频/地图数据
src/core              游戏状态、命令、回合、规则、可复现随机数
src/render            地图图块、角色动画、层次、相机、可见区缓存
src/input             点击/拖动/捏合、命中容错、目标选择、取消
src/ui                按钮、道具栏、买地/事件对话框、系统菜单
src/platform          Android 生命周期、资源导入、存档、音频恢复
android               Capacitor Android 工程
docs/rules            原版证据、已确认规则、未知点与差异
```

建议采用 TypeScript + Canvas 2D + Capacitor Android 作为首个可玩样板的候选方案。依据是该参考项目已展示完整路线，且已找到本游戏 TypeScript 资源解析实现；这仍不是性能结论。须用本游戏真实地图、角色和手机测量触摸响应、内存与帧时间后确认渲染方案。

下一步开发顺序：
1. 解析一张完整原地图和角色动画，完成可见区绘制，不能将已经提取的地图选择插图当作地图场景。
2. 完成单指拖动、双指缩放、角色／地块点击，固定屏幕空间的操作区，明确按下／抬起／取消；不依赖悬停和右键。
3. 加入两个角色的掷骰、路径移动、回合切换、买地和收租；规则未确认处标注为临时实现。
4. 加入应用切后台恢复、存档恢复和安卓打包，在真机验证后扩展其他地图、道具、事件、AI、小游戏。

## 来源

- https://github.com/iam567/rich4-renew-app
- https://github.com/iam567/rich4-renew-app/blob/25ebbb9a2692319a3baa3ebe47775c8d0c293300/game/src/ui/board-view.ts
- https://github.com/iam567/rich4-renew-app/blob/25ebbb9a2692319a3baa3ebe47775c8d0c293300/game/src/ui/pick-hit.ts
- https://github.com/iam567/rich4-renew-app/blob/25ebbb9a2692319a3baa3ebe47775c8d0c293300/game/src/ui/controls.ts
- https://github.com/iam567/rich4-renew-app/blob/25ebbb9a2692319a3baa3ebe47775c8d0c293300/game/src/ui/screens/mini-games.ts
- https://github.com/iam567/rich4-renew-app/blob/main/THIRD_PARTY.md
- https://github.com/mytbk/rich4
- https://github.com/lhuthng/doraemon-monopoly-localization
