import { inject } from 'vue'

import store from '../store/index'

import { TAB_CONTEXT_KEY } from '../helpers/tabs'

/**
 * Gives a page the means to set its own title.
 *
 * A page that is shown inside of a tab only sets the title of that tab,
 * since the title of the window is taken from the tab that is
 * currently the active one. Pages that are shown without a tab
 * set the title of the window directly.
 *
 * @returns {(value: string) => void}
 */
export function usePageTitle() {
  const tabContext = inject(TAB_CONTEXT_KEY, null)

  /**
   * @param {string} value
   */
  return function setPageTitle(value) {
    if (tabContext !== null) {
      tabContext.title = value
    } else {
      store.commit('setAppTitle', value)
    }
  }
}
