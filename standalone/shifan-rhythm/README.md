# 十番音乐节奏接龙（独立版）

这是从主项目中抽离出的纯 HTML/CSS/JavaScript 游戏模块，不依赖 Vue、Vite、npm 或主项目中的其他文件。

## 运行方式

直接双击 `index.html` 即可运行。

如果浏览器限制本地文件加载，也可以在当前目录启动任意静态文件服务器，例如：

```bash
npx serve .
```

## 目录结构

```text
shifan-rhythm/
├─ index.html
├─ style.css
├─ game.js
└─ assets/
   ├─ drum.png
   └─ gong.png
```

复制或部署整个 `shifan-rhythm` 文件夹即可独立使用。
