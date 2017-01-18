/* @flow */

import React        from 'react'
import RaisedButton from 'material-ui/RaisedButton'

type AppProps = {}

class App extends React.Component<void, AppProps, void> {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Poodle</h2>
        </div>
        <div>
          <p>Welcome to Poodle!</p>
          <RaisedButton label="Begin" />
        </div>
      </div>
    )
  }
}

export default App
