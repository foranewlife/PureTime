# PureTime 🧘‍♂️

PureTime 是一款专为开发者设计的极简专注时钟应用。它不仅提供了清爽的视觉体验，更针对 macOS 系统进行了深度优化，确保在工作流中保持最低限度的干扰。

## ✨ 功能特性

- 🕒 **后台持久计时**：计时逻辑运行在 Electron 主进程中，即便关闭应用窗口，计时依然会在后台精准运行。
- 📍 **macOS 状态栏集成**：顶部菜单栏实时显示当前状态（专注/休息/冥想）及剩余分钟数，无需打开主界面即可掌控节奏。
- 🌗 **自动深色模式**：界面色彩及应用图标（包括 Dock 栏图标）会跟随 macOS 系统主题动态切换，提供沉浸式的视觉体验。
- 🍎 **原生交互体验**：
  - 采用最新的 macOS 圆角矩形（Squircle）图标规范。
  - 支持原生的“红绿灯”控制按钮。
  - 完美的透明毛玻璃背景效果。
- 🔔 **交互式通知**：时间到达后通过系统通知提醒，并支持在通知中心直接触发“开始休息”或“稍后提醒”。

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