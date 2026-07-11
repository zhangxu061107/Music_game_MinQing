# 重构映射

| 旧版内容 | 新版位置 |
|---|---|
| 单文件首页 HTML/CSS | `src/views/HomeView.vue`、`src/styles/theme.css` |
| 页面显示/隐藏逻辑 | `src/router/index.ts` |
| 十番音乐内嵌 Base64 HTML | `public/games/rhythm/` |
| 四音记忆内嵌 Base64 HTML | `public/games/memory/` |
| 乐器 Base64 图片 | `public/assets/instruments/` |
| 老人录音逻辑 | `ElderRecorderPanel.vue`、`useMediaRecorder.ts` |
| 实时声波 | `WaveformCanvas.vue` |
| 临时声音数组 | `src/stores/voice.ts` |
| 儿童抽卡与跟读 | `ChildBlindBoxPanel.vue` |
| 原始总文件 | `legacy/original-single-file.html` |

## 重构原则

- 页面结构、业务逻辑、状态和样式分离。
- 可复用行为通过 composable 封装。
- 公共按钮、顶部栏、声波画布抽成组件。
- 使用 TypeScript 类型约束录音数据和状态。
- 对象 URL 和媒体流均在结束时清理。
