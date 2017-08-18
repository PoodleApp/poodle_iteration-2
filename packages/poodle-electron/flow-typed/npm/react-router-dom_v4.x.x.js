import * as React from 'react'

declare module 'react-router-dom' {

  // NOTE: Below are duplicated from react-router. If updating these, please
  // update the react-router and react-router-native types as well.
  declare export type Location = {
    pathname: string,
    search: string,
    hash: string,
    state?: any,
    key?: string
  }

  declare export type LocationShape = {
    pathname?: string,
    search?: string,
    hash?: string,
    state?: any
  }

  declare export type HistoryAction = 'PUSH' | 'REPLACE' | 'POP'

  declare export type RouterHistory = {
    length: number,
    location: Location,
    action: HistoryAction,
    listen(
      callback: (location: Location, action: HistoryAction) => void
    ): () => void,
    push(path: string | LocationShape, state?: any): void,
    replace(path: string | LocationShape, state?: any): void,
    go(n: number): void,
    goBack(): void,
    goForward(): void,
    canGo?: (n: number) => boolean,
    block(
      callback: (location: Location, action: HistoryAction) => boolean
    ): void,
    // createMemoryHistory
    index?: number,
    entries?: Array<Location>
  }

  declare export type Match = {
    params: { [key: string]: ?string },
    isExact: boolean,
    path: string,
    url: string
  }

  declare export type ContextRouter = {
    history: RouterHistory,
    location: Location,
    match: Match
  }

  declare export type GetUserConfirmation = (
    message: string,
    callback: (confirmed: boolean) => void
  ) => void

  declare type StaticRouterContext = {
    url?: string
  }

  declare export var StaticRouter: React.ComponentType<{
    basename?: string,
    location?: string | Location,
    context: StaticRouterContext,
    children: React.ChildrenArray<?React.Node>
  }>

  declare export var MemoryRouter: React.ComponentType<{
    initialEntries?: Array<LocationShape | string>,
    initialIndex?: number,
    getUserConfirmation?: GetUserConfirmation,
    keyLength?: number,
    children: React.ChildrenArray<?React.Node>
  }>

  declare export var Router: React.ComponentType<{
    history: RouterHistory,
    children: React.ChildrenArray<?React.Node>
  }>

  declare export var Prompt: React.ComponentType<{
    message: string | ((location: Location) => string | true),
    when?: boolean
  }>

  declare export var Redirect: React.ComponentType<{
    to: string | LocationShape,
    push?: boolean
  }>

  declare export var Route: React.ComponentType<{
    component?: React.ComponentType<ContextRouter>,
    render?: (router: ContextRouter) => React.Node,
    children?: (router: ContextRouter) => React.Node,
    path?: string,
    exact?: boolean,
    strict?: boolean
  }>

  declare export var Switch: React.ComponentType<{
    children?: Array<React.Element<*>>
  }>

  declare export function withRouter<P>(
    Component: React.ComponentType<P>
  ): React.ComponentType<$Diff<P, ContextRouter>>

  declare type MatchPathOptions = {
    path: string,
    exact?: boolean,
    strict?: boolean
  }

  declare export function matchPath(
    pathname: string,
    options: MatchPathOptions
  ): null | Match

  // NOTE: End react-router types, begin types specific to react-router-dom

  declare export class BrowserRouter extends React.Component<{
    basename?: string,
    forceRefresh?: boolean,
    getUserConfirmation?: GetUserConfirmation,
    keyLength?: number,
    children?: React.Element<*>
  }> {}

  declare export var HashRouter: React.ComponentType<{
    basename?: string,
    getUserConfirmation?: GetUserConfirmation,
    hashType?: 'slash' | 'noslash' | 'hashbang',
    children?: React.Element<*>
  }>

  declare export var Link: React.ComponentType<{
    to: string | LocationShape,
    replace?: boolean,
    children?: React.Node
  }>

  declare export var NavLink: React.ComponentType<{
    to: string | LocationShape,
    activeClassName?: string,
    className?: string,
    activeStyle?: Object,
    style?: Object,
    isActive?: (match: Match, location: Location) => boolean,
    children?: React.Node,
    exact?: boolean,
    strict?: boolean
  }>

}
