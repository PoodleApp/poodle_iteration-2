/* @flow */

import React          from 'react'
import ActivityStream from './ActivityStream'

type AppProps = {}

class App extends React.Component<void, AppProps, void> {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Poodle</h2>
        </div>
        <div>
          <ActivityStream pollInterval={300000} />
        </div>
      </div>
    )
  }
}

export default App
