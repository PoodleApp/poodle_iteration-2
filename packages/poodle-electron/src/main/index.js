/* @flow */

import { app, BrowserWindow, protocol } from 'electron'
import contextMenu from 'electron-context-menu'
import { requireTaskPool } from 'electron-remote'
import * as fs from 'fs'
import * as Path from 'path'
import { PassThrough } from 'stream'
import * as tmp from 'tmp'
import * as URL from 'url'
import './accountService'

app.on('ready', () => {
  handleMidProtocol()
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

function handleMidProtocol () {
  const rendererTasks = requireTaskPool(
    require.resolve('../renderer/fetchPartContent')
  )
  protocol.registerStreamProtocol('mid', async (request, callback) => {
    const { path: tempFile, cleanup } = await getTempFile()
    try {
      const { contentType } = await rendererTasks.writePartContentToFile(
        request.url,
        tempFile
      )
      const stream = fs.createReadStream(tempFile)
      stream.on('close', cleanup)
      callback({
        statusCode: 200,
        headers: {
          'content-type': contentType
        },
        data: stream
      })
    } catch (err) {
      console.error('error serving part content:', err)
      callback({
        statusCode: 500,
        headers: {
          'content-type': 'text/plain; charset=utf8'
        },
        data: createStream(err.message)
      })
    }
  })
}

function getTempFile (): Promise<{ path: string, cleanup: () => mixed }> {
  return new Promise((resolve, reject) => {
    tmp.file((err, path, fd, cleanup) => {
      if (err) {
        reject(err)
      } else {
        resolve({ path, cleanup })
      }
    })
  })
}

function createStream (text: string) {
  const rv = new PassThrough() // PassThrough is also a Readable stream
  rv.push(text)
  rv.push(null)
  return rv
}

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
