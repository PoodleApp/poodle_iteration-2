/*
 * Wrapper around https://github.com/TeamWertarbyte/material-ui-search-bar
 *
 * The library used here does not provide the input's value to the
 * `onRequestSearch` callback. So we need to wrap the component to track that
 * state.
 *
 * @flow
 */

import SearchBar_ from 'material-ui-search-bar'
import * as React from 'react'

type UnderlyingProps = {
  closeIcon?: React.Node,
  dataSource?: string[],
  dataSourceConfig?: { [key: string]: mixed },
  hintText?: string,
  IconButtonStyle?: { [key: string]: mixed },
  onChange?: (value: string) => any,
  onRequestSearch?: () => any,
  searchIcon?: React.Node,
  style?: { [key: string]: mixed },
  value?: string,
  disabled?: boolean
}

type Props = UnderlyingProps & {
  onSearch: (value: string) => any
}

type State = {
  value?: string
}

export default class SearchBar extends React.Component<Props, State> {
  render () {
    const {
      onSearch,
      onChange = noop,
      onRequestSearch,
      ...underlyingProps
    } = this.props

    const interceptSearchRequest = () => {
      if (onRequestSearch) {
        onRequestSearch()
      }
      if (this.state.value) {
        onSearch(this.state.value)
      }
    }

    const interceptChange = (value: string) => {
      onChange(value)
      this.setState({ value })
    }

    return (
      <SearchBar_
        onChange={interceptChange}
        onRequestSearch={interceptSearchRequest}
        {...underlyingProps}
      />
    )
  }
}

function noop(_: any) {}
