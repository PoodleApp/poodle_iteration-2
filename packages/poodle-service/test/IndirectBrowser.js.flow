/* @flow */

import EventEmitter from 'events'
import * as readline from 'readline'

export default class IndirectBrowser extends EventEmitter {
  title: ?string;

  loadUrl(url: string) {
    console.log(`Please open this URL: ${url}`)
    // setTimeout(() => this.emit('page-title-updated'))
    setTimeout(() => this.emitPageTitleUpdated(), 0)
  }

  emitPageTitleUpdated() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question('After logging in, please enter the browser window title:', title => {
      this.title = title
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
