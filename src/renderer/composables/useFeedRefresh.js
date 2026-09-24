import { onBeforeUnmount, reactive, watchEffect } from 'vue'

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
 * @param {object} options
 * @param {import('vue').Ref<string> | import('vue').ComputedRef<string>} options.title
 * @param {import('vue').Ref<string> | import('vue').ComputedRef<string>} options.lastRefreshTimestamp
 * @param {import('vue').Ref<boolean> | import('vue').ComputedRef<boolean>} [options.disableRefresh]
 * @param {() => void} options.refreshAction
 */
export function useFeedRefresh({ title, lastRefreshTimestamp, disableRefresh = null, refreshAction }) {
  const stopPublishing = watchEffect(() => {
    feedRefreshState.title = title.value
    feedRefreshState.lastRefreshTimestamp = lastRefreshTimestamp.value
    feedRefreshState.disableRefresh = disableRefresh?.value ?? false
    feedRefreshState.refreshAction = refreshAction
  })

  onBeforeUnmount(() => {
    stopPublishing()
    if (feedRefreshState.refreshAction === refreshAction) {
      feedRefreshState.title = ''
      feedRefreshState.lastRefreshTimestamp = ''
      feedRefreshState.disableRefresh = false
      feedRefreshState.refreshAction = null
    }
  })
}
