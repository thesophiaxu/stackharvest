export type UpdateGraphEventType =
  | 'user-click'
  | 'dom-update'
  | 'initial-load'
  | 'init'

export type MatchResult = {
  obj: any
  path: string[]
}

export type MatchResults = {
  obj: any
  likelies: MatchResult[]
  associated: MatchResult[]
  moreLikelies: MatchResult[]
  associables: MatchResult[]
  likeliesIdLikes: MatchResult[]
  count: number
  innerText: string
}

export type Category = {
  keys: string[]
  hash: string
  objects: any[]
  propertyNames: string[]
  slug?: string
}
