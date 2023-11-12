import _ from 'lodash'
import { ignoreList } from './consts'
import {
  getNamespace,
  runSpecialCases,
  serialize,
  sendMessage,
  getGoodAncestor,
  findLikelyDataObjects,
  getVisibleDataObjects,
  getGuessedIdLike,
  getGuessedTitleLike,
} from './extractor'

export async function tryExtractPageObj() {
  ;(window as any).__bundleId = null
  ;(window as any).__domNodesSeen = new Set()
  ;(window as any).__domNodesEventAttached = new Set()
  const visibleObjs = await getVisibleDataObjects()

  // get guessed page ids
  const lastHrefPart =
    (window as any).location.href
      .split('?')[0]
      .split('/')
      .filter((el: any) => el.length)
      .pop() || ''
  const hrefQuery = window.location.href.split('?')[1]
  const pageTitle = document.title

  // do matches
  const allObjs = Object.values(visibleObjs).flatMap((el) => el.objects)
  const pageObjsId = allObjs.filter((el) => {
    const elId = getGuessedIdLike(el, true)
    if (elId && (lastHrefPart?.startsWith(elId) || hrefQuery?.includes(elId))) {
      return true
    }
    return false
  })
  const pageObjsTitle = allObjs.filter((el) => {
    const elTitle = getGuessedTitleLike(el, true)
    if (
      elTitle &&
      pageTitle?.includes(elTitle) &&
      getGuessedIdLike(el, false)
    ) {
      return true
    }
    return false
  })
  return pageObjsId[0] || pageObjsTitle[0]
}

function _init() {
  console.log('[__phantomShell] Starting')
  if ((window as any)?.__console?.environment) {
    ;(window as any).__notionEnv = (window as any).__console.environment
  }
  setTimeout(async () => {
    const ignoreListMatches = ignoreList.filter((it) =>
      getNamespace().includes(it)
    )
    if (ignoreListMatches.length > 0) return
    const fn = async () => {
      const pastDefns = (window as any).__pastDefns
      const visibleObjs = await getVisibleDataObjects()
      const maybeUsefulObjs = Object.values(visibleObjs)
        .filter((el) => el.propertyNames.length > 0)
        .map((el) => {
          const defns = pastDefns.filter((defn: any) => {
            const keysMissing = el.keys.filter(
              (prop) => !defn.properties.find((v: any) => v.key === prop)
            ).length
            const keysExtra = defn.properties.filter(
              (prop: any) => !el.keys.find((v) => v === prop.key)
            ).length
            const isMatch =
              keysMissing === 0 ||
              (keysExtra / el.keys.length < 0.2 &&
                keysMissing / el.keys.length < 0.2) ||
              (keysMissing / el.keys.length < 0.25 && el.keys.length > 15) ||
              (keysExtra / defn.properties.length < 0.25 &&
                defn.properties.length > 15)
            if (isMatch) {
              return true
            } else return false
          })
          const defn =
            defns.find((defn: any) => defn.confirmedType === 'INGESTED') ||
            defns[0]
          return {
            ...el,
            slug: defn?.slug,
            defn,
          }
        })
        .filter(
          (el) =>
            !el.slug ||
            ['UNCONFIRMED', 'INGESTED'].includes(el.defn?.confirmedType)
        )

      runSpecialCases(maybeUsefulObjs)
      const lastHrefPart =
        window.location.href
          .split('?')[0]
          .split('/')
          .filter((el) => el.length)
          .pop() || ''
      const hrefQuery = window.location.href.split('?')[1]
      const pageObj = maybeUsefulObjs.find((el) => {
        const idKey = el.defn.properties.find((el: any) => el.isId)?.key || 'id'
        console.log(lastHrefPart, el.objects[0][idKey])
        return (
          lastHrefPart.startsWith(el.objects[0][idKey]) ||
          hrefQuery.includes(el.objects[0][idKey])
        )
      })
      if (pageObj) (window as any).__pageObj = pageObj.objects[0]

      console.log(
        maybeUsefulObjs.map((el) => JSON.parse(serialize(el, 500) || '{}'))
      )
      sendMessage(
        {
          hostname: getNamespace(),
          results: maybeUsefulObjs.map((el) =>
            JSON.parse(serialize(el, 500) || '{}')
          ),
        },
        'initial-load'
      )
    }
    fn()
    setInterval(fn, 1000 * 60) // 1 min
    const debfn = _.debounce(fn, 3000)

    document.addEventListener(
      'mouseup',
      (ev: any) => {
        let par: any = getGoodAncestor(ev.target)
        if (!par) par = ev.target.parentElement
        // console.log(par)
        if (par?.innerText?.length >= 5) {
          const text = par.innerText

          setTimeout(() => {
            const data = findLikelyDataObjects(par, text)
            // console.log(data)
            sendMessage(
              {
                ...data,
                obj: null,
                associables: [],
                likelies: [],
                associated: [],
                moreLikelies: data.moreLikelies
                  .map((el) => {
                    try {
                      return JSON.parse(serialize(el, 200) || '{}')
                    } catch (e) {
                      return false
                    }
                  })
                  .filter(Boolean),
                //associated: data.associated.map(el => { try { return JSON.parse(serialize(el)) } catch (e) { return false } }).filter(Boolean)
              },
              'user-click'
            )
            sendMessage(data.moreLikelies[0], 'user-click')
            debfn()
          }, 5)
        }
      },
      { passive: true }
    )
  }, 5000)
}

export function init() {
  ;(window as any).__bundleId = null
  ;(window as any).__domNodesSeen = new Set()
  ;(window as any).__domNodesEventAttached = new Set()
  sendMessage({ now: 'Starting...' }, 'init')
  ;(window as any).__updateDefns = (defns: any) => {
    ;(window as any).__pastDefns = defns
    if ((window as any).__gotDefns) return
    ;(window as any).__gotDefns = true
    console.log(
      `[__phantomShell] Loaded ${
        defns.length
      } past defns for ${getNamespace()}.`
    )
    _init()
  }
  ;(window as any).__extractorInitialized = true
}
