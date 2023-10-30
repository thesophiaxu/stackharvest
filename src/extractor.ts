/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from 'lodash'
import {
  escapeHTML,
  hashCode,
  isValidUUID,
  maxOverlap,
  normalizeAttribute,
  tryJSONParse,
} from './utils'
import {
  MatchResults,
  MatchResult,
  Category,
  UpdateGraphEventType,
} from './types'
import {
  badIds,
  confusingWords,
  ignoreList,
  listItemRelated,
  permittedKeys,
  uiNuggetAttrKeywords,
  uselessPathNames,
} from './consts'
import {
  isLikelyGlobalStore,
  isStyleByPath,
  isReactElement,
  isPolymerElement,
  isViewLike,
} from './stackUtils'

export const getNamespace = () => {
  if ((window as any).__bundleId) return (window as any).__bundleId
  if (
    location.hostname === 'dev.notion.so' ||
    location.hostname === 'www.notion.so'
  )
    return 'notion.so'
  return location.hostname
}

export function getAllAttributes() {
  const allAttributes: string[] = []

  // Recursive function to process each element and its children
  function processNode(node: any) {
    // if (!(node instanceof HTMLElement)) return;
    if (node.attributes) {
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i]
        if (allAttributes.indexOf(attr.name) == -1) {
          // If the attribute name is not already in the array
          allAttributes.push(attr.name)
        }
      }
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      processNode(node.childNodes[i])
    }
  }

  processNode(document.body) // Start with the body element

  return allAttributes
}

export function getNodesWithSimilarSiblings() {
  const nodesWithSimilarSiblings: HTMLElement[] = []
  const globalAttrsMap: Record<string, HTMLElement[]> = {}
  const goodKeys: string[] = []

  // Recursive function to process each element and its children
  function processNode(node: any) {
    if (!(node instanceof HTMLElement)) return
    if (node.children.length >= 3) {
      const attrsMap: Record<string, HTMLElement[]> = {}
      // Check if some children have exactly same attributes
      for (let i = 0; i < node.childNodes.length; ++i) {
        const child = node.childNodes[i]
        if (!(child instanceof HTMLElement)) continue
        const attrsKey = Array.from(child.attributes)
          .map((el) => el.name)
          .sort()
        if (
          listItemRelated.filter(
            (it) =>
              normalizeAttribute(child.className).includes(it) ||
              normalizeAttribute(child.tagName.toLowerCase()).includes(it)
          ).length > 0
        ) {
          attrsKey.push(
            child.className,
            'list-item-related',
            'list-item-related2'
          )
        }
        if (attrsKey.length <= 3) continue
        const childKey = child.tagName + '|' + attrsKey.join(',')

        if (!attrsMap[childKey]) attrsMap[childKey] = []
        if (!globalAttrsMap[childKey]) globalAttrsMap[childKey] = []
        attrsMap[childKey].push(child)
        globalAttrsMap[childKey].push(child)
      }
      Object.entries(attrsMap).forEach(([key, children]) => {
        if (children.length >= 3) {
          goodKeys.push(key)
        }
      })
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i]
      // if (!(child instanceof HTMLElement)) continue;
      processNode(child)
    }
  }

  processNode(document.body) // Start with the body element

  goodKeys.forEach((k) => nodesWithSimilarSiblings.push(...globalAttrsMap[k]))
  // console.log(nodesWithSimilarSiblings)
  return nodesWithSimilarSiblings
}

export function findLikelyEntityNodes() {
  const allAttributes = getAllAttributes()

  // Strategy 1: Get things with id
  const suitableAttrs = allAttributes.filter(
    (attr) =>
      attr.toLowerCase().endsWith('id') &&
      confusingWords.filter((word) => attr.endsWith(word)).length === 0 &&
      !badIds.includes(attr) &&
      uiNuggetAttrKeywords.filter((kwd) => attr.includes(kwd)).length === 0
  )
  const elementsFromIdQuery: HTMLElement[] = suitableAttrs.length
    ? Array.from(
        document.querySelectorAll(
          suitableAttrs.map((el) => `[${el}]`).join(', ')
        )
      )
    : []

  // console.log(elementsFromIdQuery)

  // Strategy 2: Get items with similar siblings
  const elementsFromSimilarSiblings = getNodesWithSimilarSiblings()

  // Strategy 3: Some good class names
  const elementsFromClassNames: HTMLElement[] = Array.from(
    document.querySelectorAll('.feed-card')
  )

  const finalEls = [
    ...new Set([
      ...elementsFromIdQuery,
      ...elementsFromSimilarSiblings,
      ...elementsFromClassNames,
    ]),
  ].filter((el) => el.innerText?.length >= 5)

  console.log(`Checking ${finalEls.length} nodes...`)

  return finalEls
}

export function serialize(obj: any, maxSeenCount = 20000) {
  const cache = new WeakSet()
  let seenCount = 0
  const getOneLevelDeep = (obj: any) =>
    Object.fromEntries(
      Object.entries(obj).filter(([k, v]) => typeof v !== 'object' || !v)
    )
  try {
    const res = JSON.stringify(obj, (key, value) => {
      try {
        const toJSON = value?.toJSON
      } catch (e) {
        console.error(e)
        return
      }
      if (typeof value === 'object' && value !== null) {
        if (key.toLowerCase().endsWith('store')) return getOneLevelDeep(value)
        if (
          Object.keys(value).length > 50 &&
          Object.keys(value).filter((el) => el.toLowerCase().endsWith('store'))
            .length > 5
        ) {
          return
        }
      }
      if (
        typeof value === 'object' &&
        value !== null &&
        value instanceof HTMLElement
      )
        return
      if (value?.['$$typeof']) return
      if (typeof value === 'object' && value !== null) {
        // Duplicate reference found, discard key
        if (cache.has(value) || maxSeenCount <= seenCount)
          return getOneLevelDeep(value)

        // Store value in our collection
        cache.add(value)
        seenCount++
      }
      return value
    })
    console.log('DONE')
    return res
  } catch (e) {
    console.error(e)
    return null
  }
}

export function findLikelyDataObjects(
  obj: any,
  _innerText?: string,
  maxDepth = 40
) {
  const checkQueue: [string[], any][] = [[[], obj]]
  const visited = new WeakSet()
  const innerText = _innerText || obj.innerText
  //console.log(innerText);
  const encoded = escapeHTML(innerText)
  const likelies = []
  const associables = []
  let count = 0
  let max = 2000
  let its = 0
  while (checkQueue.length > 0 && count < max && its < 100000) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore we're doing length check before here
    const [path, checkingObj] = checkQueue.shift()
    its++
    try {
      if (path.length > maxDepth) continue
      //if (checkingObj instanceof HTMLElement && checkingObj.contains(obj)) continue;
      if (visited.has(checkingObj)) continue
      if (isLikelyGlobalStore(checkingObj)) continue
      if (isStyleByPath(path)) continue
      const isCurrentReact = isReactElement(checkingObj)
      const isCurrentPolymer = isPolymerElement(checkingObj)
      if (checkingObj && typeof checkingObj === 'object') {
        if (
          !Array.isArray(checkingObj) &&
          !isCurrentReact &&
          !isCurrentPolymer &&
          !isViewLike(checkingObj) &&
          !(checkingObj instanceof HTMLElement) &&
          Object.values(checkingObj).filter(
            (el) => el !== null && el !== undefined && typeof el !== 'function'
          ).length > 4 &&
          Object.keys(checkingObj).length < 100
        ) {
          if (
            Object.values(checkingObj).filter(
              (el) =>
                typeof el === 'string' &&
                el.length > 3 &&
                (innerText.includes(el) ||
                  encoded.includes(el) ||
                  maxOverlap(el.slice(0, 1000), encoded.slice(0, 1000)) > 10)
            ).length > 0
          )
            likelies.push({
              path,
              obj: checkingObj,
              its: Object.values(checkingObj).filter(
                (el) =>
                  typeof el === 'string' &&
                  el.length > 2 &&
                  (innerText.includes(el) || encoded.includes(el))
              ),
            })
          else associables.push({ path, obj: checkingObj })
        }
        count++
        if (max < 5000 && max - count < 50 && likelies.length === 0) max += 2000
      }
      if (checkingObj && typeof checkingObj === 'object')
        visited.add(checkingObj)
      if (checkingObj && typeof checkingObj === 'object')
        Object.entries(checkingObj).map(([k, v]) => {
          if (isCurrentReact && !permittedKeys.includes(k)) return
          //if (isCurrentPolymer && Object.keys(checkingObj).filter(k => normalizeAttribute(k).includes('shadow-root')).length > 0 && !normalizeAttribute(k).includes('shadow-root')) return;
          if (
            isCurrentPolymer &&
            (normalizeAttribute(k).includes('visibility-') ||
              normalizeAttribute(k).includes('-observer') ||
              k === 'root' ||
              normalizeAttribute(k) === 'parent-component' ||
              normalizeAttribute(k) === 'host' ||
              k === '$' ||
              normalizeAttribute(k) === 'template-info')
          )
            return
          if (
            k.startsWith('__reactEventHandlers') ||
            k === '_owner' ||
            v === window ||
            v === document
          )
            return
          if (typeof v === 'object' && v) checkQueue.push([[...path, k], v])
        })
    } catch (e) {
      console.error(e)
    }
  }
  let likeliesIdLikes: any[] = []
  likelies.forEach((el) => {
    Object.entries(el.obj).forEach(([k, v]) => {
      if (
        k.toLowerCase().endsWith('id') ||
        isValidUUID(v) ||
        k.toLowerCase().includes('slug')
      ) {
        likeliesIdLikes.push(v)
      }
    })
  })
  likeliesIdLikes = [...new Set(likeliesIdLikes.filter(Boolean))]
  const associated = associables.filter(
    (checkingObj) =>
      Object.values(checkingObj.obj).filter(
        (el) =>
          (typeof el === 'string' || typeof el === 'number') &&
          likeliesIdLikes.includes(el)
      ).length > 0
  )
  return {
    obj,
    likelies,
    associated,
    moreLikelies: [...likelies, ...associated].filter(
      (el) => !uselessPathNames.includes(el.path[el.path.length - 1])
    ),
    associables,
    likeliesIdLikes,
    count,
    innerText,
  } as MatchResults
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function findLikelyStateStores() {}

export function isUselessPath(pathName: string) {
  if (uselessPathNames.includes(pathName)) return true
  if (parseInt(pathName, 10)?.toString() === pathName) return true
  return false
}

export function getPrimaryIdLike(obj: any) {
  if (typeof obj === 'object' && obj) {
    return [obj.id, obj.slug].filter(Boolean)
  }
  return
}

export function getGuessedIdLike(
  obj: any,
  exactOnly = false
): string | undefined {
  if (typeof obj !== 'object' || !obj) return
  let maybeId: string | undefined = undefined
  // try to get exact id first
  if (obj.id) maybeId = obj.id
  else if (obj.slug) maybeId = obj.slug
  if (maybeId || exactOnly) return maybeId

  // if not, try to get something that looks like an id
  const keys = Object.keys(obj)
  const idLikeKeys = keys.filter(
    (k) => k.toLowerCase().endsWith('id') || k.toLowerCase().startsWith('id')
  )
  const idLikeValues = idLikeKeys.map((k) => obj[k]).filter(Boolean)
  if (idLikeValues[0]) maybeId = idLikeValues[0]

  return maybeId
}

export function getCategoriesFromObjects(objs: MatchResult[]) {
  const _categories: Record<
    string,
    Pick<Category, 'keys' | 'hash' | 'propertyNames'> & {
      objects: Record<string, 1>
    }
  > = {}
  const keyToCategories: Record<string, string[]> = {}
  objs.forEach((obj) => {
    try {
      const serialized = serialize(obj.obj, 200)
      const keys = Object.keys(obj.obj).sort()
      const hash = hashCode(keys.join(' '))!.toString()
      if (!serialized) return
      if (!_categories[hash]) {
        _categories[hash] = {
          keys,
          hash,
          objects: {},
          propertyNames: [],
        }
        keys.forEach(
          (key) =>
            (keyToCategories[key] = [...(keyToCategories[key] || []), hash])
        )
      }
      _categories[hash].objects[serialized] = 1
      if (
        getPrimaryIdLike(obj.obj)?.includes?.(obj.path[obj.path.length - 1])
      ) {
        obj.path.pop()
      }
      const lastPath = obj.path[obj.path.length - 1]
      if (!isUselessPath(lastPath))
        _categories[hash].propertyNames.push(normalizeAttribute(lastPath))
    } catch (e) {
      console.error(e)
    }
  })
  const categories = _categories as unknown as Record<string, Category>
  Object.values(categories).forEach((category) => {
    category.objects = Object.keys(category.objects).map((el) =>
      tryJSONParse(el)
    )
    category.propertyNames = [...new Set(category.propertyNames)]
  })

  // Detect overlapping categories
  let shouldDetectOverlapping = true
  while (shouldDetectOverlapping) {
    const changes: { from: string; to: string }[] = []
    Object.values(categories).forEach((category) => {
      const overlappings: Record<string, number> = {}
      category.keys.forEach((key) => {
        const keyOverlappingsHashes = keyToCategories[key].filter(
          (el) => el !== category.hash
        )
        keyOverlappingsHashes.forEach((hash) => {
          if (typeof overlappings[hash] !== 'number') overlappings[hash] = 0
          overlappings[hash]++
        })
      })
      //console.log({ hash: category.hash, overlappings });
      Object.entries(overlappings).forEach(([hash, count]) => {
        if (
          count / categories[hash].keys.length > 0.8 &&
          count / category.keys.length > 0.8
        ) {
          changes.push({ from: hash, to: category.hash })
        }

        if (
          count / categories[hash].keys.length > 0.6 &&
          count === category.keys.length &&
          category.propertyNames.filter((name) =>
            categories[hash].propertyNames.includes(name)
          ).length > 0
        ) {
          // self is fully contained in other, so merge
          changes.push({ from: category.hash, to: hash })
        }
      })
    })
    //console.log(changes);
    changes.map(({ from, to }) => {
      if (!categories[from] || !categories[to]) return
      const newKeys = [
        ...new Set([...categories[from].keys, ...categories[to].keys]),
      ].sort()
      const newObjects = [
        ...categories[from].objects,
        ...categories[to].objects,
      ].map((newObj) => {
        newKeys.forEach((key) => {
          if (!(key in newObj)) newObj[key] = null
        })
        return newObj
      })
      const newHash = hashCode(newKeys.join(' '))!.toString()
      const newPropertyNames = [
        ...new Set([
          ...categories[from].propertyNames,
          ...categories[to].propertyNames,
        ]),
      ]
      newKeys.forEach(
        (key) =>
          (keyToCategories[key] = [
            ...(keyToCategories[key] || []).filter(
              (el) => ![from, to].includes(el)
            ),
            newHash,
          ])
      )
      delete categories[from]
      delete categories[to]
      categories[newHash] = {
        keys: newKeys,
        hash: newHash,
        objects: newObjects,
        propertyNames: newPropertyNames,
      }
    })
    if (!changes.length) shouldDetectOverlapping = false
  }
  //console.log(keyToCategories);
  return categories
}

export async function getVisibleDataObjects() {
  // Get the current timestamp in milliseconds
  const startTime = Date.now()

  // Select all elements with role="treeitem" or role="listitem"
  const _elements = findLikelyEntityNodes()
  const elements = _elements.filter(
    (el) => !(window as any).__domNodesSeen.has(el)
  )
  elements.forEach((el) => (window as any).__domNodesSeen.add(el))
  elements.forEach((el) => {
    if ((window as any).__domNodesEventAttached.has(el)) return
    ;(window as any).__domNodesEventAttached.add(el)
    el.addEventListener('change', () => {
      console.log('Changed! ', el)
      ;((window as any).__domNodesSeen as Set<any>).delete(el)
    })
    // el.childNodes.forEach((child: any) => {
    // 	child.addEventListener("change", () => {
    // 		console.log("Child Changed! ", el);
    // 		((window as any).__domNodesSeen as Set<any>).delete(el)
    // 	});
    // })
  })

  if (getNamespace() === 'notion.so' && (window as any).__notionEnv) {
    return {}
  }

  const totes: MatchResults[] = []
  for (const it of elements) {
    totes.push(
      await new Promise((res, rej) => {
        setTimeout(() => {
          const result = findLikelyDataObjects(it)
          res(result)
        }, 5)
      })
    )
  }
  // console.log(totes);
  const objs = totes.flatMap((el) => [
    ...el.likelies,
    ...el.associated.slice(0, 3),
  ])

  const categories = getCategoriesFromObjects(objs)

  const elapsedTime = Date.now() - startTime
  //sendMessage({ now: "Elapsed time: " + elapsedTime + "ms" }, "init")
  return categories
}

export function sendMessage(msg: any, type: UpdateGraphEventType) {
  const bundleId = (window as any).__bundleId
  const data = {
    __phantomShell: true,
    type,
    message: msg,
  }
  console.log(data)
  if (!bundleId) {
    window.postMessage(data)
  } else {
    ;(window as any).__phsh(data)
  }
}

export function getGoodAncestor(el: HTMLElement) {
  const elements: any = findLikelyEntityNodes()
  return elements.findLast((it: any) => it.contains(el))
}

export function runSpecialCases(
  maybeUsefulObjs: {
    slug: any
    defn: any
    keys: string[]
    hash: string
    objects: any[]
    propertyNames: string[]
  }[]
) {
  // REPLACE: This is very bad. To be deleted after implementing graph tracing
  if (
    (window as any)?.__bundleId &&
    (window as any)?.__bundleId === 'com.kishanbagaria.jack'
  ) {
    // Push participants
    const goodObjects = maybeUsefulObjs.flatMap((el) => el.objects)
    const participants = []
    for (const obj of goodObjects) {
      if (obj?.participants && Array.isArray(obj.participants)) {
        participants.push(...obj.participants)
      }
    }
    if (participants.length)
      maybeUsefulObjs.push({
        hash: '-1',
        slug: 'user_profile',
        keys: [],
        propertyNames: [],
        objects: participants,
        defn: {},
      })

    // Push messages
    const messages = []
    for (const obj of goodObjects) {
      if (obj?.messages?.array && Array.isArray(obj.messages.array)) {
        messages.push(...obj.messages.array)
      }
    }
    if (messages.length)
      maybeUsefulObjs.push({
        hash: '-2',
        slug: 'message',
        keys: [],
        propertyNames: [],
        objects: messages,
        defn: {},
      })
  }

  if (getNamespace() === 'notion.so') {
    const internalEnv =
      maybeUsefulObjs.find((el) => el.propertyNames.includes('internals'))
        ?.objects[0]?.environment || (window as any)?.__notionEnv
    if (!(window as any)?.__notionEnv && internalEnv)
      (window as any).__notionEnv = internalEnv
    if (!internalEnv) return

    const recordCache =
      internalEnv.defaultRecordCache.inMemoryRecordCache.data.data
    function getRecords(data: any) {
      const records: any[] = []
      if (data && data.id && data.version && data.type) return [data]
      if (!data || typeof data !== 'object') return records
      try {
        Object.values(data).forEach((el: any) => {
          records.push(getRecords(el))
        })
      } catch (e) {
        return []
      }
      return records.flat()
    }
    const records = _.sampleSize(
      getRecords(recordCache).map((el) => ({
        ...el,
        _url: `https://${location.hostname}/${el.id.replace(/-/g, '')}`,
      })),
      1000
    )
    console.log(records)

    // clear maybeUsefulObjs array elements in place
    maybeUsefulObjs.splice(0, maybeUsefulObjs.length)
    maybeUsefulObjs.push({
      slug: 'record',
      hash: '-1',
      keys: Object.keys(records[0]),
      propertyNames: ['records'],
      objects: records,
      defn: {},
    } as any)
  }
}
