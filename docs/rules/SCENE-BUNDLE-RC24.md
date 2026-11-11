# RC24 PNG 请求合并

`tools/build_scene_image_bundles.py`按文件名稳定排序，直接拼接原PNG字节并输出offset/length/SHA256清单，不重新编码，不删原PNG。胜利340张共1329110字节，仙人436张共406871字节。运行生成器后无需改catalog原URL。

`loadBundledImages(urls,{manifestUrl,signal,concurrency,onFallback})`返回与输入顺序一致的HTMLImageElement数组。清单一次fetch、二进制一次fetch；只为调用方所需PNG以8192字节分块转成base64 data URL，交现有有界onload→decode加载器。没有Object URL登记或撤销；临时源字符串数组在成功/失败/取消后清空，成功的HTMLImageElement持有所需图像。网络或清单索引错误会明确console.warn并调用onFallback，然后加载原PNG；取消不回退，PNG加载/解码错误不静默回退。不新增全局图像缓存（仙人原有共享缓存保留）。错误消息及QA诊断仅写内存PNG标签/字符数，不写base64。

胜利演出仍按座位/角色/等级仅加载实际静态图，总199→155张；胜利池16，其他场景默认4。bundle减少WebView本地HTTP小请求，不承诺尚未测得的实际时延。

测试：776张全部切片与原文件逐字节、SHA一致。真实Chrome检查PNG像素等价、创建Object URL总数为0、传输错误明确fallback、损坏图拒绝且可重试、延迟传输取消；报告`test-results/rc24-image-bundle/report.json`。TypeScript通过。尚需新APK原生验收和计时，旧候选慢样本保留。

原Blob方案在Android同155原图探针中登记约611ms、加载解码3079ms；data URL编码约125ms、加载解码1603ms。这是隔离探针，正式场景仍以最终APK测量为准。新浏览器测试436张图均与原文件RGBA hash一致，字节切片一致，缺包回退、损坏图片不隐式回退/修复后重试、延迟取消及传输期限均通过。
