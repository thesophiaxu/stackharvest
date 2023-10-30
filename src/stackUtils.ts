import { normalizeAttribute } from './utils'

function getAllClassNames() {
  if ((window as any)?.__allClassNames) return (window as any).__allClassNames
  const classNames: string[] = []

  // Get all elements on the page
  const allElements = document.querySelectorAll('*')

  // Convert NodeList to Array and find all class names
  Array.from(allElements).forEach((element) => {
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ') // split classes
      classNames.push(...classes)
    }
  })

  // Remove duplicate class names
  const uniqueClassNames = [...new Set(classNames)]
  ;(window as any).__allClassNames = uniqueClassNames
  return uniqueClassNames
}

export function isViewLike(obj: any) {
  if (obj?.['$$typeof'] || obj?.children?.['$$typeof']) return true
  if (
    typeof obj?.className === 'string' &&
    obj.className.length > 0 &&
    obj.className
      .split(' ')
      .filter((el: string) => !getAllClassNames().includes(el)).length === 0
  )
    return true
  if (
    typeof obj?.className === 'string' &&
    typeof obj === 'object' &&
    Object.keys(obj).filter((el) => el.startsWith('aria')).length > 0
  )
    return true
  return false
}

export function isReactElement(el: any) {
  return (
    'memoizedProps' in el &&
    'memoizedState' in el &&
    'ref' in el &&
    'return' in el &&
    'key' in el
  )
}

export function isPolymerElement(el: any) {
  return el?.innerHTML && '$' in el && ('host' in el || '_host' in el)
}

export function isLikelyGlobalStore(obj: any) {
  const keyz = Object.keys(obj)
  return keyz.length > 100
}

export function isStyleByPath(path: string[]) {
  if (!path.length) return false
  const lastAttr = normalizeAttribute(path[path.length - 1])
  return lastAttr === 'style' || lastAttr.endsWith('-style')
}
