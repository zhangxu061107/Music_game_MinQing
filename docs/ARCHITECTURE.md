# 架构说明

## 1. 应用层

`src/main.ts` 创建 Vue 应用，并注册 Vue Router 与 Pinia。

路由包含：

- `/`：游戏大厅
- `/rhythm`：十番音乐节奏接龙
- `/memory`：四音记忆小舞台
- `/voice`：乡音盲盒

采用 Hash 路由，静态部署时不需要额外配置服务器回退规则。

## 2. Canvas 游戏层

两个节奏/记忆游戏位于 `public/games/`，每个模块都拆分为：

- `index.html`：页面结构
- `style.css`：样式
- `game.js`：Canvas 循环、音频合成和交互逻辑

Vue 页面通过 iframe 加载游戏，顶部导航占据独立布局空间，不覆盖 Canvas 内容。

## 3. 乡音录音层

乡音盲盒直接作为 Vue 页面运行，不使用 iframe，避免麦克风权限被嵌套页面限制。

- `useMediaRecorder.ts`：封装 MediaRecorder API
- `WaveformCanvas.vue`：封装 AnalyserNode 和 Canvas 绘制
- `voice.ts`：保存当前页面中的录音 Blob、URL 与元数据
- `ElderRecorderPanel.vue`：老人录音流程
- `ChildBlindBoxPanel.vue`：抽卡、播放、跟读与评分

## 4. 数据流

1. 老人端调用 `useMediaRecorder.start()` 获取麦克风并开始录音。
2. `WaveformCanvas` 使用同一 MediaStream 绘制声波并上报平均振幅。
3. 录音结束后产生 Blob URL，并写入 Pinia 声音库。
4. 儿童端随机选中一条录音，播放后开始跟读录音。
5. 根据时长差与平均振幅差计算轻量相似度。

## 5. 资源管理

图片放置在 `public/assets/instruments/`，Canvas 模块和 Vue 页面共享同一套资源。
对象 URL 在删除录音或清空声音库时主动释放，减少内存占用。
