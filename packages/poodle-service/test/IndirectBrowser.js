/* @flow */

import EventEmitter from 'events'
import * as readline from 'readline'

export default class IndirectBrowser extends EventEmitter {
  title: ?string;

  loadURL(url: string) {
    console.log(`Please open this URL: ${url}`)
    // setTimeout(() => this.emit('page-title-updated'))
    setTimeout(() => this.emitPageTitleUpdated(), 0)
  }

  emitPageTitleUpdated() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question('Log in, and then paste code here: ', code => {
      this.title = `Success code=${code}`
      this.emit('page-title-updated')
    })
  }

  getTitle(): string {
    return this.title || '<no title>'
  }

  close() {
    console.log('All done - thanks!')
  }
}
