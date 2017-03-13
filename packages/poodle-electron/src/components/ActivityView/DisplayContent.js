/* @flow */

import marked  from 'marked'
import spacing from 'material-ui/styles/spacing'
import opn     from 'opn'
import React   from 'react'
import repa    from 'repa'

import type { Activity } from 'poodle-core/lib/queries/localConversation'

const styles = {
  body: {
    padding:   `${spacing.desktopKeylineIncrement * 1}px`,
    paddingTop: 0,
  },
}

export default function DisplayContent({ activity, style }: { activity: Activity, style?: Object }) {
  const content = activity.content
  if (content && content.mediaType === 'text/html') {
    return displayHtml(content.asString, style)
  }
  else if (content && content.mediaType.startsWith('text/')) {
    return displayText(content.asString, style)
  }
  else {
    return displayUnknown(content, style)
  }
}

// TODO: remove quoted replies from HTML content
function displayHtml(text: string, style?: Object) {
  const out = {
    __html: text
  }
  return <div
    className='html-content'
    dangerouslySetInnerHTML={out}
    onClick={handleExternalLink}
    style={style || styles.body}
  />
}

function displayText(text: string, style?: Object) {
  const content = repa(text)
  const out = {
    __html: marked(content, { sanitized: true })
  }
  return <div
    className='markdown-content'
    dangerouslySetInnerHTML={out}
    onClick={handleExternalLink}
    style={style || styles.body}
  />
}

function displayUnknown(content: ?{ mediaType: string, asString: string }, style?: Object) {
  return content
    ? <div style={style || styles.body}><p><em>[unknown content type: {content.mediaType}]</em></p></div>
    : <div style={style || styles.body}><p><em>[no content]</em></p></div>
}

function handleExternalLink(event: Event) {
  if (event.type === 'click' && event.target && event.target.href) {
    event.preventDefault()
    opn(event.target.href)
  }
}
