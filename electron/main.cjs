const { app, BrowserWindow, Menu } = require('electron')
const path = require('node:path')

const isDev = process.env.ELECTRON_IS_DEV === 'true'

function createWindow() {
  Menu.setApplicationMenu(null)

  const win = new BrowserWindow({
    title: 'Investor Adventure',
    width: 1280,
    height: 800,
    resizable: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  })

  win.on('page-title-updated', (event) => {
    event.preventDefault()
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
