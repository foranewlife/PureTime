import { app, BrowserWindow, ipcMain, Notification, nativeImage, nativeTheme } from 'electron'

// ... (existing code)

function createWindow() {
  const iconPath = process.env.VITE_PUBLIC ? path.join(process.env.VITE_PUBLIC, 'icon.png') : ''
  
  win = new BrowserWindow({
    width: 380,
    height: 520,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#F5F5DC',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Listen for theme changes and notify the renderer
  nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors
    win?.setBackgroundColor(isDark ? '#1e1e1e' : '#F5F5DC')
    win?.webContents.send('theme-changed', isDark)
  })

  // ... (existing icon code)
  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

// IPC Handlers
ipcMain.handle('get-theme', () => {
  return nativeTheme.shouldUseDarkColors
})

ipcMain.on('show-window', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
})

ipcMain.on('minimize-window', () => {
  win?.minimize()
})

ipcMain.on('close-window', () => {
  win?.close()
})

ipcMain.handle('send-notification', (_, { title, body, actions }) => {
  const notification = new Notification({
    title,
    body,
    actions: actions?.map((a: any) => ({ type: 'button', text: a.title }))
  })

  notification.on('action', (_event, index) => {
    const actionId = actions[index].id
    win?.webContents.send('notification-action', actionId)
  })

  notification.show()
})