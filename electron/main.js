const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

// Remove default menu bar
Menu.setApplicationMenu(null)

// History file path - stored in app's user data directory
const getHistoryPath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'history.json')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// IPC Handlers
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    const content = fs.readFileSync(filePath, 'utf-8')
    return { filePath, content }
  }
  return null
})

ipcMain.handle('dialog:saveFile', async (event, content, defaultName, fileType) => {
  const filters = fileType === 'json'
    ? [{ name: 'JSON Files', extensions: ['json'] }]
    : [{ name: 'Text Files', extensions: ['txt'] }]

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters,
  })

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { success: true, filePath: result.filePath }
  }
  return { success: false }
})

// History handlers
ipcMain.handle('history:load', async () => {
  try {
    const historyPath = getHistoryPath()
    console.log('Loading history from:', historyPath)
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf-8')
      const parsed = JSON.parse(data)
      console.log('Loaded history items:', parsed.length)
      return parsed
    } else {
      console.log('History file does not exist')
    }
  } catch (err) {
    console.error('Failed to load history:', err)
  }
  return []
})

ipcMain.handle('history:save', async (event, data) => {
  try {
    const historyPath = getHistoryPath()
    const dir = path.dirname(historyPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const jsonData = JSON.stringify(data, null, 2)
    fs.writeFileSync(historyPath, jsonData, 'utf-8')
    console.log('Saved history items:', data.length)
    return { success: true }
  } catch (err) {
    console.error('Failed to save history:', err)
    return { success: false, error: err.message }
  }
})
