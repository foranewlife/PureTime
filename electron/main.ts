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

// Timer State
type Status = "Focusing" | "Resting" | "Snoozing";
let timerStatus: Status = "Focusing"
let timeLeft = 45 * 60
let isPaused = true
let timerInterval: NodeJS.Timeout | null = null

function updateTray(force = false) {
  if (!tray) return
  
  const m = Math.ceil(timeLeft / 60)
  const timeStr = `${m}m`
  
  let statusEmoji = "⚡️"
  if (isPaused) {
    statusEmoji = "🧘"
  } else {
    if (timerStatus === "Resting") statusEmoji = "☕️"
    if (timerStatus === "Snoozing") statusEmoji = "😴"
  }
  
  const newTitle = `${statusEmoji} ${timeStr}`
  if (force || newTitle !== lastTrayTitle) {
    tray.setTitle(newTitle)
    lastTrayTitle = newTitle
  }
}

function sendTimerUpdate() {
  if (win && win.webContents) {
    win.webContents.send('timer-tick', { timeLeft, status: timerStatus, isPaused })
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval)
  isPaused = false
  updateTray()
  sendTimerUpdate()
  timerInterval = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--
      updateTray()
      sendTimerUpdate()
    } else {
      stopTimer()
      timerIsUp()
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval)
  isPaused = true
  updateTray()
  sendTimerUpdate()
}

function timerIsUp() {
  const isDark = nativeTheme.shouldUseDarkColors
  const iconPath = process.env.VITE_PUBLIC ? path.join(process.env.VITE_PUBLIC, isDark ? 'icon-dark.png' : 'icon.png') : ''
  const notification = new Notification({
    title: "休息时间到！🔔",
    body: "代码写完了吗？该起身走走啦！🏃‍♂️",
    icon: iconPath,
    actions: [
      { type: 'button', text: "开始休息" },
      { type: 'button', text: "稍后提醒" },
    ]
  })

  notification.on('action', (_event, index) => {
    if (index === 0) setTimer(5, "Resting")
    else if (index === 1) setTimer(10, "Snoozing")
  })

  notification.show()
  
  if (win) {
    win.show()
    win.focus()
  }
}

function setTimer(mins: number, status: Status) {
  timerStatus = status
  timeLeft = mins * 60
  updateTray(true)
  startTimer()
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
  const iconName = isDark ? 'icon-dark.png' : 'icon.png'
  const iconPath = process.env.VITE_PUBLIC ? path.join(process.env.VITE_PUBLIC, iconName) : ''
  
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
    const contextMenu = Menu.buildFromTemplate([
      { label: '显示窗口', click: () => win?.show() },
      { type: 'separator' },
      { label: '开始/暂停', click: () => isPaused ? startTimer() : stopTimer() },
      { label: '重置', click: () => setTimer(45, "Focusing") },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() }
    ])
    tray.setContextMenu(contextMenu)
    updateTray()
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

ipcMain.handle('get-theme', () => nativeTheme.shouldUseDarkColors)
ipcMain.handle('get-timer-state', () => ({ timeLeft, status: timerStatus, isPaused }))

ipcMain.on('start-timer', () => startTimer())
ipcMain.on('stop-timer', () => stopTimer())
ipcMain.on('set-timer', (_, { mins, status }) => setTimer(mins, status))

ipcMain.on('show-window', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
})

ipcMain.on('minimize-window', () => win?.minimize())
ipcMain.on('close-window', () => win?.hide())

ipcMain.handle('send-notification', (_, { title, body, actions }) => {
  const isDark = nativeTheme.shouldUseDarkColors
  const iconPath = process.env.VITE_PUBLIC ? path.join(process.env.VITE_PUBLIC, isDark ? 'icon-dark.png' : 'icon.png') : ''
  const notification = new Notification({
    title,
    body,
    icon: iconPath,
    actions: actions?.map((a: any) => ({ type: 'button', text: a.title }))
  })

  notification.on('action', (_event, index) => {
    const actionId = actions[index].id
    win?.webContents.send('notification-action', actionId)
  })

  notification.show()
})