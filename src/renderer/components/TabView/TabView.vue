<template>
  <RouterView
    v-slot="{ Component }"
    class="routerView"
  >
    <Transition
      mode="out-in"
      name="fade"
    >
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<script setup>
import { computed, provide, shallowReactive } from 'vue'
import { routeLocationKey, RouterView, routerKey, routerViewLocationKey, START_LOCATION } from 'vue-router'

import { getTab, TAB_CONTEXT_KEY } from '../../helpers/tabs'

const props = defineProps({
  tabId: {
    type: String,
    required: true
  }
})

const tab = computed(() => getTab(props.tabId))

/**
 * Every tab owns an isolated router, which is injected here instead of
 * injecting the router of the app.
 * That way links, route guards and `useRoute` of a page only affect the tab
 * the page is shown in.
 * The shape of `routeLocationKey` has to match the one the router plugin
 * provides, which means a plain reactive object instead of a ref.
 */
const currentRoute = tab.value.router.currentRoute
const routeLocation = {}

for (const key in START_LOCATION) {
  Object.defineProperty(routeLocation, key, {
    get: () => currentRoute.value[key],
    enumerable: true
  })
}

provide(routerKey, tab.value.router)
provide(routeLocationKey, shallowReactive(routeLocation))
provide(routerViewLocationKey, currentRoute)
provide(TAB_CONTEXT_KEY, tab.value.context)
</script>
