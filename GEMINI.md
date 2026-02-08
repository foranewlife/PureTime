# GEMINI.md - PureTime Project Context

This file provides essential context and instructions for AI agents working on the PureTime project.

## Project Overview
**PureTime** is a minimal, developer-focused focus timer application designed specifically for macOS. It features deep system integration, including a status bar (Tray) display, native notifications, and automatic theme switching.

- **Architecture**: Electron-based desktop application.
- **Frontend**: React 19 with Tailwind CSS 4.
- **Build System**: Vite 7 with `vite-plugin-electron`.
- **Primary Language**: TypeScript.

## Core Architecture & State Management
The application's core logic and timer state reside in the **Electron Main Process** (`electron/main.ts`) to ensure timing accuracy even when the window is hidden or closed.

### Application States
The app follows a state machine defined in the main process:
- `IDLE`: Ready to start a session.
- `FOCUSING`: Active countdown for work.
- `RESTING`: Active countdown for breaks.
- `ALERT`: Session completed, waiting for user action.

### Communication (IPC)
The main process and renderer process communicate via IPC:
- **Preload Script** (`electron/preload.ts`): Exposes safe `ipcRenderer` methods to the frontend via `contextBridge`.
- **Main to Renderer**: Updates state (`state-update`) and theme (`theme-changed`).
- **Renderer to Main**: Commands like `start-focus`, `toggle-pause`, `reset-timer`, etc.

## Key Files
- `electron/main.ts`: Main process logic, timer management, tray menu, and system integration.
- `electron/preload.ts`: Bridge between main and renderer processes.
- `src/App.tsx`: Main React UI component and renderer-side state synchronization.
- `package.json`: Project metadata, scripts, and dependencies.
- `vite.config.ts`: Vite configuration for both renderer and electron processes.
- `tailwind.config.js`: Tailwind CSS configuration.

## Development & Build Commands
The project uses `pnpm` as its package manager.

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Vite development server and launches Electron in dev mode. |
| `pnpm build` | Compiles TypeScript and builds production assets for the renderer. |
| `pnpm package` | Builds the app and packages it into a macOS app (`.dmg`, `.zip`) via `electron-builder`. |
| `pnpm preview` | Previews the production build. |

## Coding Conventions
- **TypeScript**: Strictly used for both main and renderer processes.
- **Tailwind CSS**: Used for all styling. Note the use of Tailwind 4.
- **System Integration**: Prioritize macOS-native feel (e.g., using `nativeTheme`, `Tray`, and Apple-specific `BrowserWindow` options).
- **Icons**: Icons are managed via `lucide-react`.

## Project Constraints
- **Platform**: Heavily optimized for macOS (`darwin`). Some features (Tray title, Dock icon switching) are macOS-specific.
- **Window**: The main window is frameless and non-resizable, using a custom title bar area for dragging.
