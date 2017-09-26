/*
 * The modules here define an IMAP interface with the particular goal of
 * limiting the number of IMAP connections for each account. Some email
 * providers are quite strict about limiting concurrent IMAP connections. To
 * keep the connection count down to 1 or 2 we want a worker that acts as a gate
 * keeper to a connection, that manages a queue of requests. In Electron we want
 * that worker to live in a background process, and renderer processes will send
 * serialized requests via IPC. On Android the worker will run in a service so
 * that it can download mail and perform queued actions when the app is not in
 * the foreground - which again means that app activities will send serialized
 * requests via IPC.
 *
 * The IMAP interface is divided into `Client` and `Server` classes. The idea is
 * that this all runs in the laptop, phone, whatever - but there should be one
 * `Server` instance in a background process, and any number of `Client`
 * instances can send requests to the `Server`. Those two classes abstract
 * communication over an `EventEmitter`, which in turn abstracts IPC
 * communication. The `EventEmitter` that is given to the `Client` and `Server`
 * classes will be constructed specially for each platform.
 *
 * @flow
 */

export * from './types'
