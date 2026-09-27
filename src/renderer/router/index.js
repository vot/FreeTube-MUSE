import { createRouter, createWebHashHistory } from 'vue-router'

import { getTabScrollPosition } from '../helpers/tabs'

import { baseRoutes, tabRoutes } from './routes'

/**
 * The web hash router of the app only keeps track of the address bar.
 * The pages themselves are rendered by the tab system, which gives every
 * tab an isolated router with its own history and route guards.
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    ...baseRoutes,
    ...tabRoutes
  ],
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getTabScrollPosition(to, from, savedPosition))
      }, 500)
    })
  }
})

export default router
