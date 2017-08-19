/* @flow */

import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import marked from 'marked'
import spacing from 'material-ui/styles/spacing'
import opn from 'opn'
import * as React from 'react'
import repa from 'repa'
import provideContent, { type ContentProps } from './provideContent'

const styles = {
  body: {
    overflowWrap: 'break-word',
    padding: `${spacing.desktopKeylineIncrement * 1}px`,
    paddingTop: 0
  }
}

type OwnProps = {
  activity: DerivedActivity,
  style?: Object
}

type Props = OwnProps & ContentProps

export function DisplayContent ({ activity, content, style }: Props) {
  const { value, error, latest } = content

  if (error && error === latest) {
    return (
      <div>
        <p>
          {String(error)}
        </p>
      </div>
    )
  }

  if (value && value.mediaType === 'text/html') {
    return displayHtml(value.content, style)
  } else if (value && value.mediaType.startsWith('text/')) {
    return displayText(value.content, style)
  } else {
    return displayUnknown(value, style)
  }
}

// TODO: remove quoted replies from HTML content
function displayHtml (text: string, style?: Object) {
  const out = {
    __html: text
  }
  return (
    <div
      className='html-content'
      dangerouslySetInnerHTML={out}
      onClick={handleExternalLink}
      style={style || styles.body}
    />
  )
}

function displayText (text: string, style?: Object) {
  const content = repa(text)
  const out = {
    __html: marked(content, { sanitized: true })
  }
  return (
    <div
      className='markdown-content'
      dangerouslySetInnerHTML={out}
      onClick={handleExternalLink}
      style={style || styles.body}
    />
  )
}

function displayUnknown (
  content: ?{ mediaType: string, content: string },
  style?: Object
) {
  return content
    ? <div style={style || styles.body}>
        <p>
          <em>
            [unknown content type: {content.mediaType}]
          </em>
        </p>
      </div>
    : <div style={style || styles.body}>
        <p>
          <em>[no content]</em>
        </p>
      </div>
}

function handleExternalLink (event: Event) {
  const target = event.target
  if (target instanceof HTMLAnchorElement && target.href) {
    event.preventDefault()
    opn(target.href)
  }
}

export default (provideContent(DisplayContent): React.ComponentType<OwnProps>)
