declare module "imap" {

  declare type ImapOpts = {
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

  declare type Namespace = {
    prefix:    string,
    delimiter: ?string,
    extensions: ?Array<{ name: 'string', params: ?Array<string> }>,
  }

  declare type Headers = { [key:string]: string[] }

  // declare type Box = {
  //   name:           string,
  //   readyOnly?:     boolean,  // only available with openBox() calls
  //   newKeywords:    boolean,
  //   uidvalidity:    number,
  //   uidnext:        number,
  //   flags:          Flag[],
  //   permFlags:      Flag[],
  //   persistentUIDs: boolean,
  //   messages: {
  //     total:   number,
  //     new:     number,
  //     unseen?: number,  // only available with status() calls
  //   }
  // }

  declare type Box = {
    attribs:   string[],
    delimiter: string,
    children:  ?Boxes,
    parent:    ?Object,
  }

  declare type Boxes = { [key:string]: Box }

  declare type MessagePart = {
    partID?:      string,
    type:         string,  // eg, 'text'
    subtype?:     string,  // eg, 'plain'
    params:       { [key:string]: string },  // eg, charset
    encoding?:    string,
    id?:          ?string,
    description?: ?string,
    disposition?: ?string,
    language?:    ?string,
    location?:    ?string,
    md5?:         ?string,
    size?:        number,
    lines?:       number,
  }

  // Should be: type MessageTree = [MessagePart, ...MessageTree]
  declare type MessageTree = MessagePart | MessageTree[]

  declare type Flag = '\\Seen'
    | '\\Answered'
    | '\\Flagged'
    | '\\Deleted'
    | '\\Draft'

  declare type FetchOptions = {
    markSeen?:  boolean,
    struct?:    boolean,  // fetch message structure
    envelope?:  boolean,
    size?:      boolean,
    modifiers?: { [key:string]: string },  // modifiers defined by IMAP extensions
    bodies?:    string | string[],  // e.g., 'HEADER.FIELDS (FROM SUBJECT TO DATE)'
  }

  declare type MessageSource = string | string[]
  declare type UID = string

  declare class ImapFetch extends events$EventEmitter {}
  // ImapFetch events:
  // - 'message' : (msg: ImapMessage, seqno: number)
  // - 'error'   : (err: Error)
  // - 'end'     : ()

  declare class ImapMessage extends events$EventEmitter {}
  // ImapMessage events:
  // - 'body' : (stream: ReadableStream, info: { which: string, size: number })
  // - 'attributes' : (attrs: MessageAttributes)
  //
  // `which` corresponds to single `bodies` element in FetchOptions

  declare type MessageAttributes = {
    uid:    number,
    flags:  Flag[],
    date:   Date,
    struct: MessageTree,
    size:   number,
    'x-gm-labels'?: string[],
    'x-gm-thrid'?:  string,
    'x-gm-msgid'?:  string,
  }

  declare class ConnectionSeq {
    fetch(source: MessageSource, opts?: FetchOptions): ImapFetch;
  }

  declare class Connection extends events$EventEmitter {
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
    closeBox(autoExpunge?: boolean, cb: (err: Error) => void): void;
    addBox(mailboxName: string, cb: (err: Error) => void): void;
    delBox(mailboxName: string, cb: (err: Error) => void): void;
    renameBox(oldName: string, newName: string, cb: (err: Error, box: Box) => void): void;
    subscribeBox(mailboxName: string, cb: (err: Error) => void): void;
    unsubscribeBox(mailboxName: string, cb: (err: Error) => void): void;
    status(mailboxName: string, cb: (err: Error, box: Box) => void): void;
    getBoxes(nsPrefix: string, cb: (err: Error, boxes: Boxes) => void): void;
    getBoxes(cb: (err: Error, boxes: Boxes) => void): void;
    getSubscribedBoxes(nsPrefix?: string, cb: (err: Error, boxes: Boxes) => void): void;

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

  declare var exports: typeof Connection
}
