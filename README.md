# PureTime 🧘‍♂️

PureTime 是一款专为开发者设计的极简专注时钟与疲劳监测应用。它不仅提供了清爽的视觉体验，更针对 macOS 系统进行了深度优化，确保在工作流中保持最低限度的干扰，同时关怀您的脑力健康。

## ✨ 功能特性

- 🕒 **后台持久计时**：计时逻辑运行在 Electron 主进程中，即便关闭应用窗口，计时依然会在后台精准运行。
- 📍 **macOS 状态栏集成**：顶部菜单栏实时显示当前状态（专注/休息/冥想）及剩余分钟数，无需打开主界面即可掌控节奏。
- 🧠 **PVT 疲劳监测**：引入专业的精神运动警觉性任务（Psychomotor Vigilance Task），通过 Z-Score 统计学算法分析您的反应时波动，科学判定疲劳等级。
- 📊 **可视化趋势分析**：
  - **24H 细粒度视图**：按 30 分钟聚合展示一天的精力波动。
  - **7D 宏观视图**：按天聚合展示一周的状态走势。
  - **大数据支持**：流畅支持上万条检测记录，支持手动删除不合理数据。
- 🌗 **自动深色模式**：界面色彩及应用图标（包括 Dock 栏图标）会跟随 macOS 系统主题动态切换。
- 🚀 **智能版本更新**：实时对接 GitHub Release，发现新版本即刻通过系统通知引导升级。
- 🍎 **原生交互体验**：采用最新 macOS 圆角矩形（Squircle）规范，支持透明毛玻璃效果及原生“红绿灯”控制。

## 🛠️ 技术栈

- **框架**: [Electron](https://www.electronjs.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **前端库**: [React](https://reactjs.org/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **打包**: [electron-builder](https://www.electron.build/)

## 🚀 快速开始

### 1. 安装依赖
```bash
pnpm install
```

### 2. 开发模式运行
```bash
pnpm dev
```

### 3. 构建 macOS 安装包
```bash
pnpm package
```
构建产物将存放在 `release/` 目录下（包括 `.dmg` 和 `.zip` 格式）。

## 📂 项目结构

- `electron/`: 主进程逻辑，负责窗口管理、计时器调度及托盘交互。
- `src/`: 渲染进程代码，包含 React UI 组件及样式。
- `public/`: 静态资源，包括自动适配主题的应用 Logo。
- `build/`: 构建专用资源，如高清 macOS 图标 (`.icns`)。

## 📜 许可证

MIT License