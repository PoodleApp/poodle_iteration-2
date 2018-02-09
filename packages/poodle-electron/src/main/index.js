/* @flow */

import { app, BrowserWindow, ipcMain, protocol } from 'electron'
import contextMenu from 'electron-context-menu'
import { requireTaskPool } from 'electron-remote'
import * as fs from 'fs'
import * as Path from 'path'
import { PassThrough } from 'stream'
import * as tmp from 'tmp'
import * as URL from 'url'
import './accountService'

if (process.env.NODE_ENV === 'development') {
  const {
    default: installExtension,
    REACT_DEVELOPER_TOOLS
  } = require('electron-devtools-installer')
  installExtension(REACT_DEVELOPER_TOOLS)
    .then(name => console.log(`Added Extension:  ${name}`))
    .catch(err => console.log('An error occurred: ', err))
}

protocol.registerStandardSchemes(['poodle'], { secure: true })

app.on('ready', () => {
  // Eventually we will run the IMAP interface in the main process in production
  // if (process.env.NODE_ENV !== 'development') {
  //   server = new S.NewServer(ipcMain, db) // Listen for IMAP requests
  // }
  handlePoodleProtocol()
  handleMidProtocol()
  createWindow('poodle://app/')
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
    createWindow('poodle://app/')
  }
})

function handlePoodleProtocol () {
  protocol.registerFileProtocol('poodle', (request, callback) => {
    // strip scheme and first component to get path
    const path = URL.parse(request.url).path || '/'
    const filePath = lookupFile(path)
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        callback({ path: lookupFile('index.html') })
      } else {
        callback({ path: filePath })
      }
    })
  })
}

function handleMidProtocol () {
  const cache = requireTaskPool(require.resolve('poodle-service/lib/cache'))
  protocol.registerStreamProtocol('mid', async (request, callback) => {
    const { path: tempFile, cleanup } = await getTempFile()
    try {
      const { contentType } = await cache.writePartContentToFile(
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

// Match request paths to files in `public/` or to source maps. This function
// also uses a bit of a hack to work around the odd way that source map paths
// are resolved when loading javascript files using `require`.
const topDir = Path.normalize(Path.join(__dirname, '..', '..'))
const sourceMapPattern = new RegExp(`${topDir}.*\\.js\\.map$`)
function lookupFile (path: string): string {
  const sourceMap = (path.match(sourceMapPattern) || [])[0]
  if (sourceMap) {
    return sourceMap
  }
  return Path.join(topDir, 'public', path)
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

function createWindow (url: string) {
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
