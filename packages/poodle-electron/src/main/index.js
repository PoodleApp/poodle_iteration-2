/* @flow */

import { app, BrowserWindow } from 'electron'
import contextMenu from 'electron-context-menu'
import * as Path from 'path'
import * as URL from 'url'
import './accountService'

app.on('ready', () => {
  createWindow()
})

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


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
let mainWindow = null

function createWindow (
  url: string = URL.format({
    pathname: Path.join(__dirname, '..', '..', 'index.html'),
    protocol: 'file:',
    slashes: true
  })
) {
  mainWindow = new BrowserWindow({ width: 800, height: 600 })

  contextMenu({
    window: mainWindow
  })

  mainWindow.loadURL(url)

  if (process.env.NODE_ENV === 'development') {
    // Open the dev tools panel
    mainWindow.openDevTools()
  }

  mainWindow.on('closed', () => {
    // Dereference the window to allow GC
    mainWindow = null
  })
}
