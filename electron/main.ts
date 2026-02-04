import { app, BrowserWindow, ipcMain, Notification, nativeImage, nativeTheme, Tray, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
let tray: Tray | null = null
let lastTrayTitle = ""

// State Machine Definitions
export type AppState = "IDLE" | "FOCUSING" | "RESTING" | "ALERT";

let currentState: AppState = "IDLE"
let timeLeft = 25 * 60 
let isPaused = true
let timerInterval: NodeJS.Timeout | null = null

function updateTrayMenu() {
  if (!tray) return

  const menuTemplate: any[] = [
    { label: `状态: ${getStatusText()}`, enabled: false },
    { type: 'separator' },
    { 
      label: '开始专注 (25m)', 
      click: () => enterFocusingState(25) 
    },
    {
      label: '选择专注时长',
      submenu: [
        { label: '25 分钟 (番茄钟)', click: () => enterFocusingState(25) },
        { label: '45 分钟 (标准模式)', click: () => enterFocusingState(45) },
        { label: '60 分钟 (深度工作)', click: () => enterFocusingState(60) },
        { label: '90 分钟 (极客模式)', click: () => enterFocusingState(90) },
      ]
    },
    { type: 'separator' },
  ]

  if (currentState === "FOCUSING" || currentState === "RESTING") {
    menuTemplate.push({ 
      label: isPaused ? '继续计时' : '暂停计时', 
      click: () => togglePause() 
    })
    menuTemplate.push({ 
      label: '重置为待机', 
      click: () => enterIdleState() 
    })
  } else if (currentState === "ALERT") {
    menuTemplate.push({ label: '开始休息 (5m)', click: () => enterRestingState(5) })
    menuTemplate.push({ label: '再坚持 10 分钟', click: () => enterFocusingState(10) })
  }

  menuTemplate.push({ type: 'separator' })
  menuTemplate.push({ label: '显示主界面', click: () => win?.show() })
  menuTemplate.push({ label: '退出 PureTime', click: () => app.quit() })

  const contextMenu = Menu.buildFromTemplate(menuTemplate)
  tray.setContextMenu(contextMenu)
}

function getStatusText() {
  switch (currentState) {
    case "IDLE": return "待机中"
    case "FOCUSING": return isPaused ? "专注已暂停" : "专注中"
    case "RESTING": return isPaused ? "休息已暂停" : "休息中"
    case "ALERT": return "时间到"
  }
}

function updateTray(force = false) {
  if (!tray) return
  
  const m = Math.ceil(timeLeft / 60)
  const timeStr = currentState === "IDLE" ? "" : `${m}m`
  
  let statusEmoji = "🧘"
  if (currentState === "FOCUSING") statusEmoji = isPaused ? "⏸" : "⚡️"
  if (currentState === "RESTING") statusEmoji = isPaused ? "⏸" : "☕️"
  if (currentState === "ALERT") statusEmoji = "🔔"
  
  const newTitle = timeStr ? `${statusEmoji} ${timeStr}` : statusEmoji
  if (force || newTitle !== lastTrayTitle) {
    tray.setTitle(newTitle)
    lastTrayTitle = newTitle
    updateTrayMenu()
  }
}

function sendStateUpdate() {
  if (win && win.webContents) {
    win.webContents.send('state-update', { 
      timeLeft, 
      state: currentState, 
      isPaused 
    })
  }
}

function togglePause() {
  isPaused = !isPaused
  updateTray(true)
  sendStateUpdate()
}

function startInterval() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (!isPaused && timeLeft > 0) {
      timeLeft--
      updateTray()
      sendStateUpdate()
    } else if (timeLeft <= 0) {
      if (currentState === "FOCUSING") {
        enterAlertState()
      } else if (currentState === "RESTING") {
        enterIdleState()
      }
    }
  }, 1000)
}

function enterIdleState() {
  currentState = "IDLE"
  timeLeft = 25 * 60
  isPaused = true
  if (timerInterval) clearInterval(timerInterval)
  updateTray(true)
  sendStateUpdate()
}

function enterFocusingState(mins: number) {
  currentState = "FOCUSING"
  timeLeft = mins * 60
  isPaused = false
  updateTray(true)
  sendStateUpdate()
  startInterval()
}

function enterRestingState(mins: number = 5) {
  currentState = "RESTING"
  timeLeft = mins * 60
  isPaused = false
  updateTray(true)
  sendStateUpdate()
  startInterval()
}

function enterAlertState() {
  currentState = "ALERT"
  timeLeft = 0
  isPaused = true
  if (timerInterval) clearInterval(timerInterval)
  updateTray(true)
  sendStateUpdate()
  showTimeUpNotification()
  
  if (win) {
    win.show()
    win.focus()
  }
}

function showTimeUpNotification() {
  const isDark = nativeTheme.shouldUseDarkColors
  const iconPath = process.env.VITE_PUBLIC ? path.join(process.env.VITE_PUBLIC, isDark ? 'icon-dark.png' : 'icon.png') : ''
  const notification = new Notification({
    title: "专注时间到！🔔",
    body: "该休息一下啦，起身走走吧！",
    icon: iconPath,
    actions: [
      { type: 'button', text: "开始休息" },
      { type: 'button', text: "再坚持10分钟" },
    ]
  })

  notification.on('action', (_event, index) => {
    if (index === 0) enterRestingState(5)
    else if (index === 1) enterFocusingState(10)
  })

  notification.show()
}

function updateDockIcon() {
  if (process.platform !== 'darwin') return
  const isDark = nativeTheme.shouldUseDarkColors
  const iconName = isDark ? 'icon-dark.png' : 'icon.png'
  const iconPath = process.env.VITE_PUBLIC ? path.join(process.env.VITE_PUBLIC, iconName) : ''
  
  if (iconPath) {
    try {
      const image = nativeImage.createFromPath(iconPath)
      if (!image.isEmpty()) {
        app.dock?.setIcon(image)
      }
    } catch (e) {
      console.error('Failed to set dock icon:', e)
    }
  }
}

function createWindow() {
  const isDark = nativeTheme.shouldUseDarkColors
  const iconPath = process.env.VITE_PUBLIC ? path.join(process.env.VITE_PUBLIC, isDark ? 'icon-dark.png' : 'icon.png') : ''
  
  win = new BrowserWindow({
    width: 380,
    height: 520,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: isDark ? '#1e1e1e' : '#F5F5DC',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      backgroundThrottling: false,
    },
  })

  win.once('ready-to-show', () => {
    win?.show()
  })

  if (!tray) {
    tray = new Tray(nativeImage.createEmpty())
    updateTray(true)
    tray.on('right-click', () => tray?.popUpContextMenu())
  }

  nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors
    win?.setBackgroundColor(isDark ? '#1e1e1e' : '#F5F5DC')
    win?.webContents.send('theme-changed', isDark)
    updateDockIcon()
  })

  updateDockIcon()

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('close', (event) => {
    if (process.platform === 'darwin' && !(app as any).isQuitting) {
      event.preventDefault()
      win?.hide()
    }
  })
}

app.on('before-quit', () => {
  (app as any).isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    win?.show()
  }
})

app.whenReady().then(createWindow)

// IPC Handlers
ipcMain.handle('get-theme', () => nativeTheme.shouldUseDarkColors)
ipcMain.handle('get-initial-state', () => ({ 
  timeLeft, 
  state: currentState, 
  isPaused 
}))

ipcMain.on('start-focus', (_, mins) => enterFocusingState(mins))
ipcMain.on('start-rest', (_, mins) => enterRestingState(mins))
ipcMain.on('toggle-pause', () => togglePause())
ipcMain.on('reset-timer', () => enterIdleState())
ipcMain.on('snooze', () => enterFocusingState(10))

ipcMain.on('minimize-window', () => win?.minimize())
ipcMain.on('close-window', () => win?.hide())
