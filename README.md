# 乐韵游戏盒（Vue 重构版）

这是从原单文件 HTML 重构而来的工程化版本。项目采用 **Vue 3 + TypeScript + Vite + Vue Router + Pinia**，并保留两个高性能 Canvas 游戏模块。

## 运行

建议安装 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址。录音功能需要浏览器允许麦克风，并要求在 HTTPS 或 localhost 环境中运行。

Windows 也可以双击 `start.bat`。

## 构建

```bash
npm run build
npm run preview
```

构建结果位于 `dist/`。

## 项目结构

```text
src/
  components/       Vue 组件
  composables/      录音等可复用逻辑
  router/           页面路由
  stores/           Pinia 状态管理
  styles/           全局样式
  types/            TypeScript 类型
  utils/            工具函数
  views/            页面级组件
public/
  assets/            乐器图片
  games/rhythm/      十番音乐节奏接龙 Canvas 模块
  games/memory/      四音记忆 Canvas 模块
legacy/              重构前单文件，仅供对照
```

## 设计说明

- 主界面、路由、乡音盲盒使用 Vue 组件化开发。
- 录音数据由 Pinia 管理，但 Blob 仅保存在内存中，刷新页面后清空。
- `useMediaRecorder.ts` 负责麦克风权限、录音开始与停止、格式兼容和清理。
- `WaveformCanvas.vue` 使用 Web Audio API、AnalyserNode 与 requestAnimationFrame 绘制实时声波。
- 两个 Canvas 游戏保持独立运行，避免游戏循环与 Vue 响应式渲染互相影响。
- 鼓、锣、木鱼和铃图片已经从内联数据中提取为独立资源。

更多说明见 `docs/ARCHITECTURE.md` 与 `docs/REFACTOR_MAP.md`。
