declare module "imap" {

  declare export type ImapOpts = {
    user?:        string,
    password?:    string,
    xoauth?:      string,
    xoauth2?:     string,
    host?:        string,
    port?:        number,
    tls?:         boolean,
    tlsOptions?:  Object,
    autotls?:     'always' | 'required' | 'never',
    connTimeout?: number,
    authTimeout?: number,
    keepalive?:   boolean | { interval?: number, idleInterval?: number, forceNoop?: boolean },
    debug?:       (info: string) => void,
  }

  declare export type Namespace = {
    prefix:    string,
    delimiter: ?string,
    extensions: ?Array<{ name: 'string', params: ?Array<string> }>,
  }

  declare export type Headers = { [key:string]: string[] }

  declare export type Box = {
    flags: Flag[],
    highestmodseq: string, // formatted as a number
    keywords: string[],
    messages: {
      total: number,
      new: number,
      unseen?: number, // only available with status() calls
    },
    name: string, // full name hierarchy, separated by delimiters
    newKeywords: boolean,
    nomodseq: boolean,
    permFlags: Flag[],
    persistentUIDs: boolean,
    readOnly?: boolean, // only available with openBox() calls
    uidnext: number,
    uidvalidity: number,
  }

  declare export type BoxListItem = {
    attribs:   string[],
    delimiter: string,
    children:  ?BoxList,
    parent:    ?Object,
  }

  declare export type BoxList = { [key:string]: BoxListItem }

  declare export type Disposition = {
    params: ?{ [key: string]: string },
    type: string
  }

  declare export type MessagePart = {
    partID?:      string,
    type:         string,  // eg, 'text'
    subtype?:     string,  // eg, 'plain'
    params:       { [key:string]: string },  // eg, boundary, charset
    encoding?:    string,
    id?:          ?string,
    description?: ?string,
    disposition?: Disposition,
    language?:    ?string,
    location?:    ?string,
    md5?:         ?string,
    size?:        number, // in bytes, only set if requested in `fetch()`
    lines?:       number,
  }

  /*
   * If Flow supported a rest-tuple syntax, this type would properly be:
   *
   *     type MessageStruct = [MessagePart, ...MessageStruct]
   *
   * Since Flow does not support that, we must use a type definition that is
   * a little more general than it should be.
   */
  declare export type MessageStruct = (MessagePart | MessageStruct)[]

  declare export type Flag = string
  // declare export type Flag = '\\Seen'
  //   | '\\Answered'
  //   | '\\Flagged'
  //   | '\\Deleted'
  //   | '\\Draft'

  declare export type FetchOptions = {
    markSeen?:  boolean,
    struct?:    boolean,  // fetch message structure
    envelope?:  boolean,
    size?:      boolean,
    modifiers?: { [key:string]: string },  // modifiers defined by IMAP extensions
    bodies?:    string | string[],  // e.g., 'HEADER.FIELDS (FROM SUBJECT TO DATE)'
  }

  declare export type MessageSource = string | string[] | number[]
  declare export type UID = string

  declare export type ImapFetch = events$EventEmitter
  // ImapFetch events:
  // - 'message' : (msg: ImapMessage, seqno: number)
  // - 'error'   : (err: Error)
  // - 'end'     : ()

  declare export type ImapMessage = events$EventEmitter
  // ImapMessage events:
  // - 'body' : (stream: ReadableStream, info: { which: string, size: number })
  // - 'attributes' : (attrs: MessageAttributes)
  //
  // `which` corresponds to single `bodies` element in FetchOptions

  declare export type MessageId = string // unique message ID in angle brackets

  declare export type MessageAttributes = {
    uid:    number,
    flags:  Flag[],
    date:   Date,
    struct: MessageStruct,
    envelope: {
      date:      string,  // ISO 8601
      subject:   string,
      from:      Address[],
      sender:    Address[],
      replyTo:   Address[],
      to:        Address[],
      cc:        ?Address[],
      bcc:       ?Address[],
      inReplyTo: ?MessageId,
      messageId: MessageId,
    },
    size?: number,
    'x-gm-labels'?: string[],
    'x-gm-thrid'?:  string,
    'x-gm-msgid'?:  string,
  }

  declare export type Address = {
    name?:   string,  // e.g., person's full name
    mailbox: string,  // username portion of email address
    host:    string,  // host portion of email address
  }

  declare class ConnectionSeq {
    fetch(source: MessageSource, opts?: FetchOptions): ImapFetch;
  }

  declare export default class Connection extends events$EventEmitter {
    state:     string;  // eg. 'disconnected', 'connected', 'authenticated'
    delimiter: ?string; // folder hierarchy delimiter
    namespaces: {
      personal: Namespace[],
      other:    Namespace[],
      shared:   Namespace[],
    };
    static parseHeader(rawHeader: string, disableAutoDecode?: boolean): Headers;
    constructor(opts?: ImapOpts): void;
    connect(): void;
    end(): void;
    destroy(): void;
    openBox(mailboxName: string, openReadOnly?: boolean, modifiers?: Object,
            cb: (err: Error, mailbox: Box) => void): void;
    openBox(mailboxName: string, openReadOnly?: boolean,
            cb: (err: Error, mailbox: Box) => void): void;
    openBox(mailboxName: string,
            cb: (err: Error, mailbox: Box) => void): void;
    closeBox(cb: (err: Error) => void): void;
    closeBox(autoExpunge: boolean, cb: (err: Error) => void): void;
    addBox(mailboxName: string, cb: (err: Error) => void): void;
    delBox(mailboxName: string, cb: (err: Error) => void): void;
    renameBox(oldName: string, newName: string, cb: (err: Error, box: Box) => void): void;
    subscribeBox(mailboxName: string, cb: (err: Error) => void): void;
    unsubscribeBox(mailboxName: string, cb: (err: Error) => void): void;
    status(mailboxName: string, cb: (err: Error, box: Box) => void): void;
    getBoxes(nsPrefix: string, cb: (err: Error, boxes: BoxList) => void): void;
    getBoxes(cb: (err: Error, boxes: BoxList) => void): void;
    getSubscribedBoxes(nsPrefix?: string, cb: (err: Error, boxes: BoxList) => void): void;

    search(criteria: any[], cb: (err: Error, uids: UID[]) => any): void;

    // All of these methods have sequence-based counterparts. Those are declared
    // in `ConnectionSeq`.
    seq: ConnectionSeq;
    fetch(source: MessageSource, opts?: FetchOptions): ImapFetch;
    serverSupports(capability: string): boolean;
  }
  // Imap events:
  // - 'ready' : ()
  // - 'alert' : (message: string)
  // - 'mail'  : (numNewMsgs: number)
  // - 'expunge' : (seqno: number)
  // - 'uidvalidity' : (uidvalidity: number)
  // - 'update' : (seqno: number, info: Object)
  // - 'error' : (err: Error & { source: string })
  // - 'close' : (hadError: boolean)
  // - 'end' : ()
}
