/* @flow */

import * as Drv from 'arfe/lib/models/DerivedActivity'
import * as URI from 'arfe/lib/models/uri'
import { Card, CardHeader } from 'material-ui/Card'
import FlatButton from 'material-ui/FlatButton'
import Paper from 'material-ui/Paper'
import * as colors from 'material-ui/styles/colors'
import spacing from 'material-ui/styles/spacing'
import moment from 'moment'
import * as q from 'poodle-core/lib/queries/conversation'
import React from 'react'
import * as Vocab from 'vocabs-as'
import Avatar from '../Avatar'
import ActivityOptsMenu from './ActivityOptsMenu'
import DisplayContent from './DisplayContent'
import EditNote from './EditNote'
import * as helpers from './helpers'

import type { ActivityViewProps } from './types'

const styles = {
  activityCard: {
    paddingBottom: `${spacing.desktopGutterLess * 1}px`
  },
  asideContainer: {
    padding: '1em',
    paddingTop: 0
  },
  body: {
    padding: `${spacing.desktopKeylineIncrement * 1}px`,
    paddingTop: 0
  },
  documentBody: {
    paddingBottom: `${spacing.desktopKeylineIncrement * 1}px`
  },
  inlineNotice: {
    padding: '16px',
    paddingBottom: 0
  },
  inlineNoticeUnderHeader: {
    padding: '16px',
    paddingBottom: 0,
    paddingTop: 0
  },
  menu: {
    float: 'right'
  }
}

const contextTypes = {
  muiTheme: React.PropTypes.object.isRequired
}

export default function ActivityView (props: ActivityViewProps) {
  const { activity } = props
  const { Aside, Conflict, Join } = Drv.syntheticTypes

  if (helpers.hasType(Conflict, activity)) {
    return <ConflictView {...props} />
  } else if (helpers.hasType(Join, activity)) {
    return <JoinView {...props} />
  } else if (activity.hasObjectType(Vocab.Note)) {
    return helpers.editing(props, activity)
      ? <EditNote {...props} />
      : <NoteView {...props} />
  } else if (activity.hasObjectType(Vocab.Document)) {
    return helpers.editing(props, activity)
      ? <EditNote {...props} />
      : <DocumentView {...props} />
  } else {
    return <UnknownView {...props} />
  }
}

function ActivityCard (props: { nestLevel: ?number, children?: any }) {
  return (
    <div style={styles.activityCard}>
      <Paper {...props} zDepth={props.nestLevel || 1}>
        {props.children}
      </Paper>
    </div>
  )
}

function NoteView (props: ActivityViewProps) {
  const { activity, nestLevel } = props
  const actor = activity.actor
  const actorStr = (actor && actor.name) || '[unknown author]'
  const dateStr = moment(activity.publishTime).fromNow()
  return (
    <ActivityCard nestLevel={nestLevel}>
      <CardHeader
        title={actorStr}
        subtitle={dateStr}
        avatar={actor && <Avatar {...actor} />}
      >
        <LikeButton style={{ float: 'right' }} {...props} />
        <ActivityOptsMenu style={styles.menu} {...props} />
      </CardHeader>
      {activity.isEdited
        ? <p style={styles.inlineNoticeUnderHeader}>
            <em>
              Last edited {moment(activity.latestEditTime).fromNow()}
            </em>
          </p>
        : ''}
      <DisplayContent activity={activity} />
    </ActivityCard>
  )
}

function DocumentView (props: ActivityViewProps) {
  const { activity, conversation } = props

  const actor = activity.actor
  const actorStr = (actor && actor.name) || '[unknown author]'

  const dateStr = moment(activity.publishTime).fromNow()
  const editDateStr =
    activity.isEdited && moment(activity.latestEditTime).fromNow()

  const latestUpdate = activity.revisions[0].updateActivity
  const editor = latestUpdate && latestUpdate.actor
  const editorStr = (editor && editor.name) || '[unknown editor]'
  return (
    <div>
      <h2>
        {conversation.subject}
      </h2>
      {activity.isEdited
        ? <p>
            <em>
              Last edited {editDateStr} by {editorStr}
            </em>
          </p>
        : <p>
            <em>
              Posted {dateStr} by {actorStr}
            </em>
          </p>}
      <DisplayContent activity={activity} style={styles.documentBody} />
    </div>
  )
}

function ConflictView (props: ActivityViewProps) {
  const { account, activity, nestLevel } = props

  // const { palette } = (this.context: any).muiTheme.baseTheme  // TODO
  // const backgroundColor = palette.borderColor
  const backgroundColor = 'red' // TODO

  return (
    <ActivityCard nestLevel={nestLevel} style={{ backgroundColor }}>
      <div style={styles.inlineNotice}>
        <strong>Edit failed due to a conflict with another edit.</strong>
      </div>
      <DisplayContent activity={activity} />
    </ActivityCard>
  )
}

function JoinView (props: ActivityViewProps, context) {
  const { activity, nestLevel } = props

  const actor = activity.actor
  const actorStr = (actor && actor.name) || '[unknown author]'

  const { palette } = context.muiTheme.baseTheme
  const backgroundColor = palette.borderColor

  return (
    <ActivityCard nestLevel={nestLevel} style={{ backgroundColor }}>
      <CardHeader
        title={actorStr}
        subtitle='joined the discussion'
        avatar={actor && <Avatar {...actor} />}
      />
    </ActivityCard>
  )
}

JoinView.contextTypes = contextTypes

function AsideView (props: ActivityViewProps) {
  const nestLevel = props.nestLevel || 1
  const { activity, conversation } = props

  const aside = activity.aside
  if (!aside) {
    return <p>[private aside not found]</p>
  }

  const ppl = aside.participants.map(p => p.displayName).join(', ')

  // TODO: This is a bit of a hack
  // const showReplyForm = m.equals(activity, m.last(m.filter(act => (
  //   Act.hasType(Act.syntheticTypes.Aside, act) && m.equals(act.aside, activity.aside)
  // ), conversation.activities)))

  const activities = aside.activities.map(act =>
    <ActivityView
      {...props}
      activity={act}
      conversation={aside}
      key={act.id}
      nestLevel={nestLevel + 1}
    />
  )

  // const { palette } = (this.context: any).muiTheme.baseTheme
  // const backgroundColor = palette.primary3Color
  const backgroundColor = 'red' // TODO

  return (
    <ActivityCard
      nestLevel={nestLevel}
      style={{ backgroundColor: backgroundColor }}
    >
      <CardHeader title='private aside' subtitle={ppl} avatar={<span />} />
      <div style={styles.asideContainer}>
        {activities}
      </div>
    </ActivityCard>
  )
}

function UnknownView (props: ActivityViewProps) {
  const { activity, nestLevel } = props
  const actor = activity.actor
  const actorStr = (actor && actor.name) || '[unknown author]'
  const dateStr = moment(activity.publishTime).fromNow()
  return (
    <ActivityCard nestLevel={nestLevel}>
      <CardHeader
        title={actorStr}
        subtitle={dateStr}
        avatar={actor && <Avatar {...actor} />}
      />
      <DisplayContent activity={activity} />
    </ActivityCard>
  )
}

type LikeButtonProps = ActivityViewProps & {
  style?: Object
}

function LikeButton (props: LikeButtonProps) {
  const { account, activity, loading, style } = props
  const me = URI.mailtoUri(account.email)
  const alreadyLiked = activity.likedBy(me)
  const mine = helpers.myContent(activity, account.email)

  function like () {
    // TODO:
    // const { activity, conversation, dispatch } = props
    // dispatch(A.like(activity, conversation))
  }

  return (
    <FlatButton
      style={style || {}}
      label={`+${activity.likeCount + 1}`} // `
      onTouchTap={like}
      disabled={mine || alreadyLiked || loading}
    />
  )
}
