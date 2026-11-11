# RC22：道具效果结束演出

## 已证实的缺漏

旧实现只在 `useItem` 时播放 Tools.dat 动画。回合开始时 `tickPlayerEffects` 删除状态，分身及跟随者随即消失，竹蜻蜓直接切换站姿；因此这些演出确实遗漏。

本轮只静态读取工作区 PC 副本和 DAT，未启动原 EXE。新 PC SHA-256：`b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1`，REA/Ghidra 12.1.4。以下是反编译观察，不是新跑出的 PC 动态录像。完整工具证据保存在 `research/rc22-item-lifecycleA/B/C/D.json`、`research/rc22-item-lifecycleCtor.json`、`research/rc22-item-factoryNew.json`。

| 道具 | 新 PC 证据 | 实现的退出过程 |
| --- | --- | --- |
| 分身药水 24 | `49b7db` | 三分身各自位置播放 Tools33；第一/第二/第三分别延迟 10/5/0 tick；各动画事件111删除对应分身 |
| 一分为二刀 32 | `49e86f` | 分身位置播放 Tools33；事件111删除分身 |
| 竹蜻蜓 38 | `4a31e2` | 人物位置播放构造字段+14指定的 Tools42；事件111切换站姿3 |
| 机器人小姐 1 | 构造 `491320` + 公共退出 `4909a3` | 等待60 tick，按方向播放 Tools1–4 替换原跟随者，动画结束删除 |
| 玩具军队 8 | `49492e` + `4909a3` | 等待60 tick，Tools92–95 |
| 机械小矮人 14 | `496ded` + `4909a3` | 等待60 tick，Tools109–112；接管结束时取小矮人现有位置，身体按引擎已有逻辑回到保存位置 |
| 保镖 23 | `499d8c` + `4909a3` | 等待60 tick，Tools126–129 |
| 粘人糖 35 | 构造 `49ff60` + `4a0653` | 等待60 tick，跟随者位置覆盖 Tools181，事件111隐藏跟随者 |
| 缩形隧道 6 | 构造 `492e79` + `493d54` | 日计数到期后，在原道路位置用 Tools29+方向立即替换旧隧道，等待动画结束 |
| 任意门 37 | 构造 `4a10ea` + `4a2043` | 日计数到期后，用 Tools53+(方向>>1)替换旧门，等待动画结束 |

直接读新 PE 虚函数表+10也确认 `4ba624/4ba950/4bac08/4bb01c` 指向 `4909a3`，`4bb58c` 指向 `4a0653`。构造器+13c是真实退出动画表，不是根据连续编号猜测。

DAT 控制项 `spriteIndex=0x8000|111` 的出现帧：Tools33 是第5帧；42 是第2帧；181 是第6帧。普通跟随者退出以动画完成事件101结束。等待和帧号保持原顺序；手机端实际播放速度由已有显示时钟决定。

全42项构造记录的退出虚函数+10已逐项盘点：除上述十类，其他均进入无可见动作的 `48f1a1/49031c`。道路类额外证据见 `research/rc22-item-lifecycleRoad.json`、`research/rc22-item-lifecycleRoadCtor.json`。

## 资金反馈核对

- 没有“招财猫”道具；对应目录存在狸猫套装15、储钱蜜蜂20。
- 狸猫套装改变租金收款人，沿用已有 `rentRecipient` 和 `cashVisualPlan`。退出 `49031c` 只有状态返回，没有独立资金演出。
- 储钱蜜蜂的公共退出 `48f1a1` 没有独立画面。
- 处境掉换枪33的 `49f67f` 直接交换资产、背包和地产，然后结束。未调用收款/付款动画，因此本轮未凭余额变化另加现金飞行。
- 缩小39的 `4a3ac7` 在计数结束时调用 `438aaa(...,0)` 恢复大小，没有单独退出动画。

`49709c` 确实存在小矮人 Tools121–124 的一次性切换，其条件是内部 flag4 与虚函数+14调度；不能仅凭引擎 `active` 字段推断它等于“刚昏睡接管”。资源已提取，但本轮没有把未经核实的触发时机接入。

## 集成接口

`itemLifecyclePlan(map,before,after,command,catalog)` 必须在成功的 `executeCommand` 后调用，获得按人物/效果顺序排列的组。判断使用 `id:source`，支持同名不同来源效果。不修改状态，不消耗随机数。

每组含 `kind:'itemLifecycle'`、`actor/item/point`、`tracks` 和总 `frames`。一组内 tracks 并行播放，不应串行跑三分身。所有画面使用已提交后的游戏状态，退出前的形象由计划独立保存。

`timing` 为 `before-action` 或 `after-action`：beginTurn/roll/aiAction 的当前玩家已武装计数且 remaining=1 的自然结束，以及由昏睡自然结束带来的小矮人归还，排在本命令的施放/骰子之前；其余冲突移除在施放后。道路退出只需要动画，没有额外ghost类型。

`itemLifecycleFrame(group,frame,catalog)` 返回：

- `sprites`：来自 `assets/item-lifecycle/catalog.json` 的精灵命令，附世界 `point`，用现有 `boardActorSpritePoint` 锚点画。
- `ghosts`：暂留的旧演员。`kind:'character'` 含完整 `player` 快照及 `direction`，用角色绘制器；`kind:'companion'` 含旧 `item-animations` 动画索引，画静止跟随者。
- `replaceActors`：竹蜻蜓事件111前需要隐藏普通新状态玩家，否则旧飞行姿态和新站姿重叠。事件后列表为空。

Ghost和退出动画须加入世界深度序列，地面属性框仍先于演员。`group.frames` 到达后队列前进。回合 `roll/aiAction` 可内含 effect tick，必须在骰子/初始道具演出之前排入退出组。存档恢复不重播旧结束演出；只有活跃命令的前后状态产生计划。

资源通过 `tools/extract_item_lifecycle.py` 从 `work/vm-original-verified` 读取，生成独立目录，无覆盖原目录。新增 PNG 可由现有非atlas加载回退读取。

## 验证

`node --test tests/item-lifecycle-presentation.test.mjs tests/item-presentation.test.mjs tests/effects.test.mjs`：16/16通过。

覆盖真实 useItem→beginTurn 提交：三分身实际生成点、单分身、四方向跟随者、粘人糖延迟及事件消失、竹蜻蜓事件前后姿态替换、小矮人归还身体位置、资源完整性、重复 beginTurn 无重复结束演出、计划不修改游戏状态，以及现有42道具初始展示回归。浏览器/Android成品截图由集成后验证补充；单元测试不等同于PC画面逐帧一致。

集成后的 `app/dist` 在5185静态服务完成8种浏览器触屏验收（2026-11-09）：三分身、单分身、竹蜻蜓、机器人小姐、小矮人醒来、粘人糖、缩形隧道、任意门。流程为合法存档→标题→大富翁→继续→自动执行到期动画→返回可操作状态；确认真实Canvas绘制了新目录的原版精灵、每组期间busy=true、结束后状态已移除且无页面异常。结果 `test-results/rc22-item-lifecycle-ui.json`，截图 `test-results/rc22-lifecycle-*.png`，测试脚本 `tests/item-lifecycle-ui.cjs`。浏览器截图已人工查看分身、小矮人、竹蜻蜓与门的画面。此项是触屏版运行验证，不是原PC逐帧录像对比。

最终 RC22 APK（SHA-256 `d9024e89a333784eea98c62bec666e695a8ea4001d6242c7fdba607f9e4da2ed`）在 Android x86_64 模拟器通过两组原生验收：分身退出实际绘制12张原精灵，竹蜻蜓退出21张，退出期间锁定操作，结束恢复骰子按钮；native GameSave 和 localStorage 均保存最终状态；重新载入继续游戏不重播退出动画。脚本 `tests/rc22-lifecycle-android.cjs`，报告 `test-results/rc22-android-lifecycle.json`，真实surface截图 `test-results/rc22-android-lifecycle-original-24.png`、`test-results/rc22-android-lifecycle-original-38.png`。截图已查看，画面正常。

原生脚本先将 native 完整读值与全部 localStorage 落盘并 fsync，finally 恢复后逐值核验；报告 `restored:true`。备份仅保存在 `work/qa-private-backups`，不属于发布材料。所有CDP读写/导航限时15秒，截图使用ADB真实surface。第一轮仅测试注入器失效（Android没有执行addScriptToEvaluateOnNewDocument），已恢复原存储后修成直接安装观测器；第二轮exit0，两组全部通过，未因此修改产品。
