# 原版豆沙包收支反馈（RC21）

新PC SHA256：`b99f70be2a703b7f20e5d7dbf6d29f2ffca86303f4be420bf9fb334cbe792eb1`。本轮采用 REA/Ghidra 12.1.4 静态反编译，未将静态结果称为原PC实机录像。

证据与顺序：

- `research/v126-clone-rent-controller.json`（443bb1）：先按颠倒笔/狸猫服等最终方向结算双方现金、更新显示，然后44f4fd处理地产，再调用44f7ca。正常付款有音效74、角色pose6；颠倒收款方向相反。**租金不是人物间跨地图飞行**，动画定位在当前角色与相邻地产之间，远端收款人仅更新现金。
- `research/rc21-cash-feedback-44f7ca.json`：创建数字与豆沙包动画，数字偏移(40,-60)，动画在角色所在格。方向0/1/2/3对应北/南/西/东。出钱Anime.dat索引55+方向×3+高度，入钱67+方向×3+高度；高度为楼层整除2。方向4则48入钱、49出钱。临时隐藏邻格建筑，等待反馈结束后恢复。
- `research/rc21-circle-feedback-44442d.json`：奖励圈、非空罚款池采用48和pose5；征罚实际扣钱49和pose6。租金池采用50在原屏幕(280,220)位置播放，再显示数字，不应冒充普通48。空池、免罚不播放扣钱成功动画。
- `research/v126-property-ai-human-buy.json`、`v126-property-ai-buy.json`、`v126-property-ai-upgrade-transaction.json`（442ffe）、`v126-property-ai-sale.json`（443628）：买地/升级负数反馈，升级取旧等级高度；卖地正数反馈高度0，均在已结算后展示。地产变化动画另属建筑系统。
- `research/rc21-cash-character-pose-439064.json`：pose选择使用角色构造表和大小档，0x200状态禁止更换动作。
- `research/new-pc-startup-rea.json`：004cd49c加载anime.dat，004cc8f8加载sprite1.dat，数字字体004ccf40加载fonts.dat。

`tools/extract_cash_animations.py` 从工作区原版资源副本work/vm-original-verified读取27段动画及64张精灵，产物`assets/cash-animations/catalog.json`记录源文件SHA256。已目视核对旋转豆沙包精灵，不用自绘金币替代。

接口：`cashVisualPlan(map,before,after,action)` 返回只读展示计划；在executeCommand提交后调用，不重算/扣付金额，不消费游戏随机数。`receipts`给出实际双方余额，`delta`为展示金额，`balanceDelta`保留刷新取整后的现金差。`cashPresentationSprites`提供预加载精灵集合。租金使用最终debtor/creditor，兼容颠倒和狸猫服重定向；免租、未付款、取消买卖和普通走路不生成成功反馈。地产事件通过前后所有权/等级识别，兼容真人及AI答案。

渲染：`animationFrame(animation,tick,false)`保留DAT飞行坐标，`boardActorSpritePoint`与棋盘人物相同锚点；不得使用默认removeMotion=true。一次播放约46/47帧（30Hz）；租金池50为124帧。先保存提交结果，再锁后续行动播放，暂停期间停止推进；禁止把绘制回调变成第二次付款。可同屏显示receipts作为触屏适配。

范围：本模块已提供原动画、选片规则、金额与pose计划。字体若采用浏览器文本属于手机可读性适配，不是fonts.dat逐像素还原；建筑临时遮挡、pose在被限制状态下的优先级、数字飘动逐帧及原PC实际播放时序需由集成层遵循/验证。尚未添加仙人奖惩、道具资金转移、商店买卖、月结等未在本轮核实的效果。

原PC经济模式现金不足也立即扣到负数，反馈照常展示；没有先借款后点击支付步骤。旧legacy存档的debt提示不保留rent标记，此模块未将该旧模式的answer/pay冒认为原版租金，不影响pc-v126新局。`node --test tests/rent-presentation.test.mjs`六项通过，含不足现金立即负余额、非提交负例、四方向三高度、原资源逐帧引用检查；原PC截图逐帧比较尚未执行。

生产页面验证：`tests/cash-presentation-ui.cjs`以触屏点击生产dist继续游戏/升级/暂停，read-only Canvas drawImage记录确认真正绘制cash-animations原PNG。租金暂停时帧冻结，恢复后无二次扣款；动画中冷重载存档后保留余额且不重播交易。奖励、罚款、升级同样实际绘制，余额与引擎单次提交一致。5项通过、页面错误0；报告与四图在`test-results/rc21-cash-ui/`。租金截图已目视核对。

动作锁补核：413f30读取`this+0x2fc`，不是effectCapabilities聚合位。缓存`research/items-b-effects-20261107.json`的438bc6显示original14存在时切Tools113..120替身，再置0x200。新PC立即数置位调用扫描另发现450c9e同样在动画对象替换后置位，其完整分支未复核；记录`research/rc21-cash-pose-lock-sites.txt`，不称穷尽所有间接置位。小矮人替身保持自己的姿势有依据，单纯small尺寸不等于此锁；睡眠/飞行优先级属于尚未逐分支证明的集成保护规则。

升级高度复核：442ffe虽先增加地产等级，但传入44f7ca的第五参数明确是`(level - 1) / 2`，因此计划使用before.levels正确。专测新增1→2、3→4实际升级，验证动画仍取旧高度；目前现金模块单测7项通过。

最终APK原生范围：2026-11-09在安卓模拟器5580的已安装独立APK验证，SHA256 `4e0f2a96901ecf1f65657975cb5aa7ab3377fb56e47d3b4018c12ee54fe57173`。`QA_ANDROID=1 node tests/cash-presentation-ui.cjs`专测租金，实际Canvas绘制cash-animations精灵，余额一次变化、暂停帧冻结及恢复、动画中reload续局不重复扣款均通过，错误0。报告`test-results/rc21-cash-ui-android/report.json`；原生GameSave和完整localStorage已在finally恢复并逐值校验，`storage-restored.json`记录成功，敏感临时备份验证后删除，不加入交付包。

原生测试输入限制必须保留：两次通过CDP触摸抢暂停窗口均因模拟器往返耗时超过1.5秒而未捕获，不计通过，诊断`early-attempts.json`。成功的现金暂停使用首次真实Canvas绘制后触发生产菜单DOM按钮click，未修改游戏状态、帧或时钟；继续游戏和其他导航仍使用CDP触摸。因而这项证明暂停处理逻辑与原生绘制/存档恢复，不宣称现金播放期间全程物理触屏操作或已测所有实体手机。

同一最终APK最后一轮补核动画结束后的普通暂停入口：实际CDP touchStart/touchEnd打开菜单并继续游戏成功。最终报告3项通过、脚本exit0，存储恢复验证完成；不再增加回归范围。
