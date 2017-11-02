/* @flow strict */

import type { MessageAttributes } from 'imap'

export const multipartAlternative: MessageAttributes =
{
  "struct": [
    {
      "type": "alternative",
      "params": {
        "boundary": "001a1149d07e3f8f41052a57e0ee"
      },
      "language": null
    },
    [
      {
        "partID": "1",
        "type": "text",
        "subtype": "plain",
        "params": {
          "charset": "UTF-8"
        },
        "id": null,
        "description": null,
        "encoding": "7BIT",
        "size": 266,
        "lines": 6,
        "md5": null,
        "language": null
      }
    ],
    [
      {
        "partID": "2",
        "type": "text",
        "subtype": "html",
        "params": {
          "charset": "UTF-8"
        },
        "id": null,
        "description": null,
        "encoding": "7BIT",
        "size": 403,
        "lines": 3,
        "md5": null,
        "language": null
      }
    ]
  ],
  "envelope": {
    "date": "2016-01-27T21:56:36.000Z",
    "subject": "Earlier time for meeting tonight: 6:30",
    "from": [
      {
        "name": "Jesse Hallett",
        "mailbox": "jesse",
        "host": "sitr.us"
      }
    ],
    "sender": [
      {
        "name": "Jesse Hallett",
        "mailbox": "jesse",
        "host": "sitr.us"
      }
    ],
    "replyTo": [
      {
        "name": "Jesse Hallett",
        "mailbox": "jesse",
        "host": "sitr.us"
      }
    ],
    "to": [
      {
        "name": "Portland JavaScript Admirers",
        "mailbox": "pdxjs",
        "host": "googlegroups.com"
      }
    ],
    "cc": null,
    "bcc": null,
    "inReplyTo": "<CAGM-pNtKjg1ivF0M+P0E_spUULirnMtqRT-GOtZc5ehNtBy=Bw@mail.gmail.com>",
    "messageId": "<CAGM-pNuNmZ9tS1-4CA9s0Sb=dGSdi3w51NghoubSkqt5bUP6iA@mail.gmail.com>"
  },
  "date": new Date("2016-01-27T21:56:36.000Z"),
  "flags": [
    "\\Seen"
  ],
  "uid": 97784,
  "modseq": "2065174",
  "x-gm-labels": [
    "\\Sent"
  ],
  "x-gm-msgid": "1524557987322127438",
  "x-gm-thrid": "1524557830832189264"
}
