import { inject, onBeforeUnmount, reactive, watchEffect } from 'vue'

import { getActiveTabId, TAB_CONTEXT_KEY } from '../helpers/tabs'

/**
 * Shared reactive state published by feed pages (Subscriptions, Popular, Trending)
 * and consumed by the top nav refresh button (FtRefreshWidget).
 */
export const feedRefreshState = reactive({
  /** @type {string} */
  title: '',
  /** @type {string} */
  lastRefreshTimestamp: '',
  /** @type {boolean} */
  disableRefresh: false,
  /** @type {(() => void) | null} */
  refreshAction: null
})

/**
 * Registers a page's feed refresh information with the top nav refresh button.
 * The state is kept up to date while the calling component is mounted and is
 * cleared once it is unmounted.
 *
 * Only the tab that is currently shown publishes its information. Tabs stay
 * mounted in the background, so without this a feed that is open in another
 * tab would keep the refresh button on top of pages that cannot be refreshed
 * at all, such as the history or the playlists.
 *
 * @param {object} options
 * @param {import('vue').Ref<string> | import('vue').ComputedRef<string>} options.title
 * @param {import('vue').Ref<string> | import('vue').ComputedRef<string>} options.lastRefreshTimestamp
 * @param {import('vue').Ref<boolean> | import('vue').ComputedRef<boolean>} [options.disableRefresh]
 * @param {() => void} options.refreshAction
 */
export function useFeedRefresh({ title, lastRefreshTimestamp, disableRefresh = null, refreshAction }) {
  const tabContext = inject(TAB_CONTEXT_KEY, null)

  function clearState() {
    feedRefreshState.title = ''
    feedRefreshState.lastRefreshTimestamp = ''
    feedRefreshState.disableRefresh = false
    feedRefreshState.refreshAction = null
  }

  // This has to wait for the first render. A page that is written with the
  // options API does not have its data while `setup` is running, so reading a
  // data property through `instance.proxy` at that point makes Vue cache it as
  // an unknown property instead of as a data property. Every later read of it
  // then returns `undefined`, as the fallback to the data of the render context
  // only exists in development builds.
  const stopPublishing = watchEffect(() => {
    // Reading the active tab makes this effect run again on every switch
    const isShownTab = tabContext === null || tabContext.id === getActiveTabId()

    if (isShownTab) {
      feedRefreshState.title = title.value
      feedRefreshState.lastRefreshTimestamp = lastRefreshTimestamp.value
      feedRefreshState.disableRefresh = disableRefresh?.value ?? false
      feedRefreshState.refreshAction = refreshAction
    } else if (feedRefreshState.refreshAction === refreshAction) {
      // This tab is being hidden and is the one that is published
      clearState()
    }
  }, { flush: 'post' })

  onBeforeUnmount(() => {
    stopPublishing()
    if (feedRefreshState.refreshAction === refreshAction) {
      clearState()
    }
  })
}
