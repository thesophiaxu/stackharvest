export const permittedKeys = [
  'memoizedProps',
  'memoizedState',
  'return',
  'alternate',
  'output',
  'child',
  'stateNode',
]

export const uiNuggetAttrKeywords = ['tooltip', 'selected-item-id']
export const confusingWords = ['void']
export const badIds = ['id', 'target-id']

export const listItemRelated = [
  'list-item',
  'table-row',
  'grid-row',
  '-container',
  '-thread',
  'message-',
]

export const uselessPathNames = [
  ...permittedKeys,
  'args',
  'props',
  'state',
  'obj',
  'current',
  'value',
  'data',
]

export const ignoreList = ['localhost', 'mail.google.com']
