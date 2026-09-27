import { reactive, ref, shallowReactive, shallowRef } from 'vue'
import { createMemoryHistory, createRouter, START_LOCATION } from 'vue-router'

import { baseRoutes } from '../router/routes'

/**
 * Injection key of the tab a component is rendered in.
 * It gives components access to the identity and the state of their tab,
 * which is needed since tabs are not rendered below a `RouterView` of the
 * app level router.
 * @type {import('vue').InjectionKey<import('./tabs').TabContext>}
 */
export const TAB_CONTEXT_KEY = Symbol('tabContext')

const TAB_ID_REGEX = /^\/tab(\d+)(?=\/|$)/
const TAB_ID_NUMBER_REGEX = /^tab(\d+)$/
const TAB_ID_PREFIX = 'tab'
const TAB_ID_MIN_DIGITS = 2

/** @type {import('vue').ShallowRef<import('./tabs').Tab[]>} */
const tabs = shallowRef([])
/** @type {import('vue').Ref<string | null>} */
const activeTabId = ref(null)

let nextTabNumber = 0
let isEnabled = false
let isInitialized = false
/** @type {import('vue-router').Router | null} */
let globalRouter = null
let fallbackPath = '/subscriptions'
let pendingGlobalFullPath = null
/** @type {Set<string>} */
const pendingTabFullPaths = new Set()
let isPopNavigation = false

/**
 * @returns {import('./tabs').Tab[]}
 */
export function getTabs() {
  return tabs.value
}

/**
 * @returns {string | null}
 */
export function getActiveTabId() {
  return activeTabId.value
}

/**
 * @returns {import('./tabs').Tab | null}
 */
export function getActiveTab() {
  return tabs.value.find(tab => tab.id === activeTabId.value) ?? null
}

/**
 * @param {string} tabId
 * @returns {import('./tabs').Tab | null}
 */
export function getTab(tabId) {
  return tabs.value.find(tab => tab.id === tabId) ?? null
}

/**
 * @param {string} tabId
 * @returns {import('vue-router').Router | null}
 */
export function getTabRouter(tabId) {
  return getTab(tabId)?.router ?? null
}

/**
 * @returns {import('vue-router').Router | null}
 */
export function getActiveTabRouter() {
  return getActiveTab()?.router ?? null
}

export function isTabsEnabled() {
  return isEnabled
}

/**
 * @param {string} path
 * @returns {string | null}
 */
export function getTabIdFromPath(path) {
  return path.match(TAB_ID_REGEX)?.[0].slice(1) ?? null
}

/**
 * @param {string} path
 * @returns {string}
 */
export function stripTabIdFromPath(path) {
  if (getTabIdFromPath(path) === null) {
    return path
  }

  return path.replace(TAB_ID_REGEX, '') || '/'
}

/**
 * @param {string} path
 * @param {string} tabId
 * @returns {string}
 */
export function addTabIdToPath(path, tabId) {
  return path === '/' ? `/${tabId}` : `/${tabId}${path}`
}

/**
 * @returns {string}
 */
function createTabId() {
  nextTabNumber += 1

  return `${TAB_ID_PREFIX}${String(nextTabNumber).padStart(TAB_ID_MIN_DIGITS, '0')}`
}

/**
 * Makes sure newly created tabs don't reuse the id of a tab that the app
 * was opened with
 * @param {string} tabId
 */
function reserveTabIdNumber(tabId) {
  const number = parseInt(tabId.match(TAB_ID_NUMBER_REGEX)?.[1] ?? '0', 10)

  if (number > nextTabNumber) {
    nextTabNumber = number
  }
}

/**
 * @param {string} tabId
 * @returns {import('./tabs').Tab}
 */
function createTabObject(tabId) {
  const history = createMemoryHistory()

  // Links of a tab are rendered as links to the app itself, so that gestures
  // like opening them in a new window keep working
  history.createHref = (location) => isEnabled
    ? `#${addTabIdToPath(location, tabId)}`
    : `#${location}`

  const router = createRouter({
    history,
    routes: baseRoutes
  })

  const context = reactive({
    id: tabId,
    isActive: false,
    /** Title of the currently shown page, e.g. the video title of a watch page */
    title: '',
    /** Search text of the search bar while this tab was the active one */
    searchQueryText: ''
  })

  /** @type {import('./tabs').Tab} */
  const tab = {
    id: tabId,
    router,
    context,
    scrollTop: 0
  }

  router.afterEach(() => {
    // A page sets the title of its tab once it has loaded,
    // until then the title of its route is used
    tab.context.title = ''

    handleTabNavigation(tab)
  })

  return tab
}

/**
 * @param {import('./tabs').Tab} tab
 */
function handleTabNavigation(tab) {
  if (!isInitialized || tab.id !== activeTabId.value) {
    return
  }

  const key = getTabRouteKey(tab)

  if (pendingTabFullPaths.has(key)) {
    pendingTabFullPaths.delete(key)
    return
  }

  updateGlobalUrl(tab, false)
}

/**
 * @param {import('./tabs').Tab} tab
 * @returns {string}
 */
function getTabRouteKey(tab) {
  return `${tab.id}|${tab.router.currentRoute.value.fullPath}`
}

/**
 * @param {import('./tabs').Tab} tab
 * @returns {{ path: string, query: import('vue-router').LocationQuery, hash: string }}
 */
function getGlobalLocationForTab(tab) {
  const route = tab.router.currentRoute.value

  return {
    path: isEnabled ? addTabIdToPath(route.path, tab.id) : route.path,
    query: route.query,
    hash: route.hash
  }
}

/**
 * @param {import('./tabs').Tab} tab
 * @param {boolean} replace
 */
function updateGlobalUrl(tab, replace) {
  if (globalRouter === null) {
    return
  }

  const location = getGlobalLocationForTab(tab)
  const fullPath = globalRouter.resolve(location).fullPath

  if (fullPath === globalRouter.currentRoute.value.fullPath) {
    return
  }

  pendingGlobalFullPath = fullPath

  if (replace) {
    globalRouter.replace(location)
  } else {
    globalRouter.push(location)
  }
}

/**
 * Applies an address bar location to a tab.
 * Navigations that originate from the app itself are pushed onto the history
 * of the tab, while going back and forth through browser history has to
 * replace the current entry to keep both histories in sync.
 * @param {import('./tabs').Tab} tab
 * @param {import('vue-router').RouteLocationNormalized} location
 * @param {boolean} replace
 */
function applyRouteToTab(tab, location, replace) {
  const target = {
    path: stripTabIdFromPath(location.path),
    query: location.query,
    hash: location.hash
  }

  if (tab.router.resolve(target).fullPath === tab.router.currentRoute.value.fullPath) {
    return
  }

  pendingTabFullPaths.add(`${tab.id}|${tab.router.resolve(target).fullPath}`)

  if (replace) {
    tab.router.replace(target)
  } else {
    tab.router.push(target)
  }
}

/**
 * @param {import('vue-router').RouteLocationNormalized} location
 */
function handleGlobalNavigation(location) {
  if (!isInitialized) {
    return
  }

  const isPop = isPopNavigation
  isPopNavigation = false

  if (location.fullPath === pendingGlobalFullPath) {
    pendingGlobalFullPath = null
    return
  }

  let tab = getTabIdFromPath(location.path) !== null
    ? getTab(getTabIdFromPath(location.path))
    : null

  if (isEnabled && tab === null) {
    const activeTab = getActiveTab()

    if (activeTab !== null) {
      // Unprefixed URLs are not used while tabs are enabled,
      // so bring the address bar back in line with the active tab
      updateGlobalUrl(activeTab, true)
      return
    }
  }

  if (tab === null) {
    tab = getActiveTab()
  }

  if (tab === null) {
    return
  }

  if (tab.id !== activeTabId.value) {
    activateTab(tab.id, { skipGlobalUpdate: true })
  }

  applyRouteToTab(tab, location, isPop)
}

function handlePopState() {
  isPopNavigation = true
}

/**
 * Shows the given tab and stores the scroll position of the previously
 * active tab, so that it can be restored when that tab is shown again
 * @param {string} tabId
 * @param {{ skipGlobalUpdate?: boolean, replace?: boolean }} [options]
 * @returns {import('./tabs').Tab | null}
 */
export function activateTab(tabId, { skipGlobalUpdate = false, replace = false } = {}) {
  const tab = getTab(tabId)

  if (tab === null) {
    return null
  }

  const previousTab = getActiveTab()

  if (previousTab !== null && previousTab.id !== tabId) {
    previousTab.scrollTop = window.scrollY
    previousTab.context.isActive = false
  }

  activeTabId.value = tabId
  tab.context.isActive = true

  if (!skipGlobalUpdate) {
    updateGlobalUrl(tab, replace)
  }

  return tab
}

/**
 * @param {{
 *   path?: string,
 *   query?: import('vue-router').LocationQuery,
 *   hash?: string,
 *   searchQueryText?: string,
 *   activate?: boolean
 * }} [options]
 * @returns {Promise<import('./tabs').Tab | null>}
 */
export async function createTab({
  path = '/',
  query = undefined,
  hash = undefined,
  searchQueryText = '',
  activate = true
} = {}) {
  if (!isInitialized) {
    return null
  }

  const tab = createTabObject(createTabId())

  tab.context.searchQueryText = searchQueryText
  tabs.value = [...tabs.value, tab]

  await tab.router.replace({ path, query, hash })

  if (activate) {
    activateTab(tab.id)
  }

  return tab
}

/**
 * Opens the page the app starts at in a new tab
 * @returns {Promise<import('./tabs').Tab | null>}
 */
export function createNewTab() {
  return createTab({ path: fallbackPath, activate: true })
}

/**
 * @param {string} tabId
 */
export function closeTab(tabId) {
  const index = tabs.value.findIndex(tab => tab.id === tabId)

  if (index === -1) {
    return
  }

  clearPendingTabPaths(tabId)

  const wasActive = tabs.value[index].id === activeTabId.value
  const remainingTabs = tabs.value.filter(tab => tab.id !== tabId)

  if (remainingTabs.length === 0) {
    // The last tab is replaced by a fresh one, so that there is always
    // something to show and to fall back to.
    // It is activated right away to keep the app from being without an
    // active tab while the new one is loading.
    const replacement = createTabObject(createTabId())
    const location = { path: fallbackPath }

    tabs.value = [replacement]
    activeTabId.value = replacement.id
    replacement.context.isActive = true

    pendingTabFullPaths.add(getTabRouteKey(replacement))
    void replacement.router.replace(location).then(() => {
      updateGlobalUrl(replacement, true)
    })

    return
  }

  tabs.value = remainingTabs

  if (wasActive) {
    // Closing a tab should not add another entry to the history
    activateTab(remainingTabs[Math.min(index, remainingTabs.length - 1)].id, { replace: true })
  }
}

/**
 * Forgets the navigations of a tab that is not around anymore
 * @param {string} tabId
 */
function clearPendingTabPaths(tabId) {
  for (const key of pendingTabFullPaths) {
    if (key.startsWith(`${tabId}|`)) {
      pendingTabFullPaths.delete(key)
    }
  }
}

/**
 * Navigates the active tab without adding an entry to the address bar history
 * @param {{ path: string, query?: import('vue-router').LocationQuery }} location
 */
export function replaceActiveTabRoute(location) {
  const tab = getActiveTab()

  if (tab === null) {
    return
  }

  const fullPath = tab.router.resolve(location).fullPath

  if (fullPath === tab.router.currentRoute.value.fullPath) {
    return
  }

  pendingTabFullPaths.add(`${tab.id}|${fullPath}`)
  tab.router.replace(location)
}

/**
 * Adds or removes the tab id of the active tab in the address bar and
 * discards the tabs that are no longer reachable while tabs are disabled
 * @param {boolean} value
 */
export function setTabsEnabled(value) {
  isEnabled = value

  if (!isInitialized) {
    return
  }

  if (!value) {
    const activeTab = getActiveTab()

    if (activeTab !== null) {
      tabs.value = [activeTab]
    }
  }

  const tab = getActiveTab()

  if (tab !== null) {
    updateGlobalUrl(tab, true)
  }
}

/**
 * @param {string} path
 */
export function setTabsFallbackPath(path) {
  fallbackPath = path
}

/**
 * @param {import('vue-router').RouteLocationNormalized} to
 * @param {import('vue-router').RouteLocationNormalized} from
 * @param {{ left: number, top: number } | null} savedPosition
 * @returns {{ left: number, top: number }}
 */
export function getTabScrollPosition(to, from, savedPosition) {
  if (isInitialized && isEnabled) {
    const toTabId = getTabIdFromPath(to.path)
    const fromTabId = getTabIdFromPath(from.path)

    if (toTabId !== null && toTabId !== fromTabId) {
      const tab = getTab(toTabId)

      if (tab !== null) {
        return { left: 0, top: tab.scrollTop }
      }
    }
  }

  return savedPosition ?? { left: 0, top: 0 }
}

/**
 * Sets up the initial tab and starts mirroring navigations between the
 * address bar and the tabs
 * @param {import('vue-router').Router} router
 * @param {{ enabled?: boolean }} [options]
 * @returns {Promise<import('./tabs').Tab | null>}
 */
export async function initTabs(router, { enabled = false } = {}) {
  globalRouter = router
  isEnabled = enabled

  const currentRoute = router.currentRoute.value
  const routeTabId = getTabIdFromPath(currentRoute.path)
  const tabId = routeTabId ?? createTabId()

  if (routeTabId !== null) {
    reserveTabIdNumber(routeTabId)
  }

  const tab = createTabObject(tabId)

  tabs.value = [tab]
  activeTabId.value = tabId
  tab.context.isActive = true

  await tab.router.replace({
    path: stripTabIdFromPath(currentRoute.path),
    query: currentRoute.query,
    hash: currentRoute.hash
  })

  isInitialized = true

  router.afterEach(handleGlobalNavigation)
  window.addEventListener('popstate', handlePopState)

  if (enabled) {
    updateGlobalUrl(tab, true)
  }

  return tab
}

/** @type {import('vue-router').Router | null} */
let tabAwareRouter = null
/** @type {import('vue').ShallowReactive<import('vue-router').RouteLocationNormalized> | null} */
let tabAwareRoute = null

/**
 * The router that components outside of a tab, e.g. the side navigation,
 * have to use, since the pages themselves belong to a tab.
 * Navigating with the router of the app instead would not be applied to the
 * tab that is shown while the tabbed interface is enabled.
 * @returns {import('vue-router').Router}
 */
export function getTabAwareRouter() {
  if (tabAwareRouter === null) {
    tabAwareRouter = new Proxy({}, {
      get(_target, property) {
        const router = getActiveTabRouter() ?? globalRouter
        const value = router == null ? undefined : router[property]

        return typeof value === 'function' ? value.bind(router) : value
      }
    })
  }

  return tabAwareRouter
}

/**
 * The route of the tab that is shown, for the same reason as the router above
 * @returns {import('vue').ShallowReactive<import('vue-router').RouteLocationNormalized>}
 */
export function getTabAwareRoute() {
  if (tabAwareRoute === null) {
    const route = {}

    for (const key in START_LOCATION) {
      Object.defineProperty(route, key, {
        get: () => (getActiveTabRouter() ?? globalRouter)?.currentRoute.value[key],
        enumerable: true
      })
    }

    tabAwareRoute = shallowReactive(route)
  }

  return tabAwareRoute
}
