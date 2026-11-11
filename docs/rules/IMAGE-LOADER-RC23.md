# RC23 原图加载与退出

`app/src/scene-image-loader.ts`集中处理月结、GAME OVER、真人胜利/片尾、证书和原版标题的PNG加载。先注册onload/onerror、再赋src；onload完成后才decode，避免Android WebView尚在载入时立即decode失败。默认最多4张同时加载/解码；每张20秒期限覆盖两个阶段；失败或AbortSignal取消会清除监听、取消活动请求、不再启动排队图像。输出顺序保持原输入顺序，原图、色板与动画时序不变。

月结、结局与真人演出沿用根提供的signal。证书新增第4参数signal，载入期间宿主移除或dialog真正关闭会取消，HTTP/decode失败不会留下空证书，已完成加载后signal仍可dispose。标题新增最后一个可选signal和返回dispose，取消后清理RAF、ResizeObserver、MutationObserver及自身菜单DOM。

`node --test tests/image-loader.test.cjs`5项通过：延迟下有界并发与顺序；载入中取消；解码中取消/迟到完成；网络和解码失败取消同批；超时与预取消。`tests/image-loader-ui.cjs`实际Chrome4组通过：延迟PNG时退出、宿主移除、HTTP404、正常原PNG绘制后取消；报告`test-results/rc23-image-loader/report.json`。TypeScript检查通过。

生产与原生演出回归脚本支持`QA_REVISION=rc23`，输出与RC22历史分开；原生报告仅累计相同APK SHA的实际通过项，支持`QA_EXPECT_APK_SHA`断言，finally成功恢复原生存档及全localStorage并reload核验后才标记恢复完成。本文件此时仅描述已完成的源/加载器验证，最终APK验收另记实际hash。

RC23生产dist真实CDP触屏5组全部通过、page/audio错误0：普通月结9→10、提前月结9、AI字母结局6、真人原开场/两页→证书→完整1520帧片尾、黄耳跳证书直接片尾；保存重进不重复结算/解锁/榜单。额外延迟catalog后退出race通过。报告与截图单独保存在`test-results/rc23-ending-production/`。启动时5185服务未运行的首次连接拒绝不计通过；启动只读preview后完整重跑通过。

最终RC23 code54 APK SHA256 `f34190973842a62caee4e6e3ce6f0a08e7bd1f19a57cbe03dbdef66c9ffaaca7`原生三组同轮通过：月结9→10确认金额不重复、AI字母曲6回标题、真人原两页至证书曲4，page/audio错误0。ADB证书图已目视，月结原canvas非透明采样19200点/117色。存档与全部localStorage恢复并reload逐值核验后私有备份删除，设备交下一代理。报告`test-results/rc23-ending-native/report.json`不继承RC22通过项。实际首次真人gate加载10.622秒，assets-out到证书3.756秒；有界并发以吞吐换稳定，此处不宣称加载更快。资源记录无victory原图失败，取消请求为切场景的旧音轨/UI。原生不重复50秒片尾，完整片尾已在同版浏览器验证。

无后台包文件校验的单次真人对照仍需9.352秒，证明原10.622秒不能仅归因为磁盘竞争。实际胜利sources为199张、199次decode；最初149资源数是ResourceTiming默认250条缓冲达到上限后的部分记录。完整decode记录平均90.15ms、合计17.94秒，最多4工人的decode等待下界约4.485秒；已记录147张网络平均70.60ms，但网络记录不是全集。见独立`test-results/rc23-idle-probe-ending-native/timing-summary.json`及`human-progress.json`。建议胜利单独提高有界并发至16，保持先onload再decode和其他场景默认4；这只是证据支持的优化建议，尚未据此声称新性能或修改产品。该对照通过真人至证书并完整恢复存档，未覆盖三组最终报告。后续性能脚本已提高ResourceTiming缓冲容量，避免样本截断。
