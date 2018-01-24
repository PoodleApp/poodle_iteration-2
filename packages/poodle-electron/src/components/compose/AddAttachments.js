/* @flow */

import Chip from 'material-ui/Chip'
import Dropzone from 'react-dropzone'
import * as React from 'react'

type Props = {
  attachments: ?(File[]),
  onAddAttachments: (attachments: File[]) => void,
  onRemoveAttachment: (attachment: File) => void
}

const styles = {
  attachmentsEditor: {
    display: 'flex',
    justifyContent: 'flex-start',
    flexFlow: 'row nowrap'
  },
  attachmentsList: {
    display: 'flex',
    alignContent: 'flex-start',
    justifyContent: 'flex-start',
    flexFlow: 'row wrap'
  },
  chip: {
    alignSelf: 'flex-start',
    margin: 4
  },
  dropTargetText: {
    margin: '1em'
  }
}

export default function AddAttachments (props: Props) {
  // TODO: handle rejected files (second argument to `onDrop` callback)
  // TODO: Dropzone can provide file previews - at least for images
  const attachments = props.attachments || []
  return (
    <section style={styles.attachmentsEditor}>
      <div>
        <Dropzone onDrop={props.onAddAttachments} disablePreview={true}>
          <p style={styles.dropTargetText}>
            To add attachments drop files here, or click to select files.
          </p>
        </Dropzone>
      </div>
      {attachments.length > 0 ? <Attachments {...props} /> : ''}
    </section>
  )
}

export function Attachments (props: Props) {
  const as = (props.attachments || []).map((a, i) =>
    <Chip
      key={i}
      onRequestDelete={() => props.onRemoveAttachment(a)}
      style={styles.chip}
    >
      {a.name} ({a.size} bytes)
    </Chip>
  )
  return (
    <aside style={styles.attachmentsList}>
      {as}
    </aside>
  )
}
