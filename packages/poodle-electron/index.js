/* @flow */

const { app, BrowserWindow } = require('electron')
const contextMenu = require('electron-context-menu')
const path = require('path')
const url = require('url')

if (process.env.NODE_ENV === 'development') {
  const {
    default: installExtension,
    REACT_DEVELOPER_TOOLS
  } = require('electron-devtools-installer')
  installExtension(REACT_DEVELOPER_TOOLS)
    .then(name => console.log(`Added Extension:  ${name}`))
    .catch(err => console.log('An error occurred: ', err))
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
let mainWindow = null

function createWindow () {
  mainWindow = new BrowserWindow({ width: 800, height: 600 })

  contextMenu({
    window: mainWindow
  })

  // Load browser portion of app
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    })
  )

  if (process.env.NODE_ENV === 'development') {
    // Open the dev tools panel
    mainWindow.openDevTools()
  }

  mainWindow.on('closed', () => {
    // Dereference the window to allow GC
    mainWindow = null
  })

  // ipc.respond('google-account', account.setupGoogle)
}

app.on('ready', createWindow)

// Quit when all windows have been closed - except in OS X
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!mainWindow) {
    createWindow()
  }
})
