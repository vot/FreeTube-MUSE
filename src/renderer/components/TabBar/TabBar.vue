<template>
  <div
    class="tabBar"
    :class="{ tabBarBarColor: barColor }"
  >
    <div
      class="tabList"
      role="tablist"
    >
      <div
        v-for="tab in tabList"
        :key="tab.id"
        class="tabItem"
        :class="{ isActive: tab.context.isActive }"
        role="tab"
        tabindex="0"
        :aria-selected="tab.context.isActive"
        :title="getTabTitle(tab)"
        @click="activateTab(tab.id)"
        @keydown.enter="activateTab(tab.id)"
        @keydown.space.prevent="activateTab(tab.id)"
        @auxclick="handleTabAuxClick($event, tab.id)"
      >
        <span
          class="tabTitle"
        >
          {{ getTabTitle(tab) }}
        </span>
        <button
          class="closeButton"
          :aria-label="t('Tabs.Close Tab')"
          :title="t('Tabs.Close Tab')"
          @click.stop="closeTab(tab.id)"
        >
          <FontAwesomeIcon
            :icon="['fas', 'xmark']"
          />
        </button>
      </div>
    </div>
    <button
      class="newTabButton"
      :aria-label="t('Tabs.New Tab')"
      :title="t('Tabs.New Tab')"
      @click="createNewTab"
    >
      <FontAwesomeIcon
        :icon="['fas', 'plus']"
      />
    </button>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import store from '../../store/index'

import { activateTab, closeTab, createNewTab, getTabs } from '../../helpers/tabs'
import { getTabTitle } from '../../helpers/strings'

const { t } = useI18n()

/** @type {import('vue').ComputedRef<import('../../helpers/tabs').Tab[]>} */
const tabList = computed(() => getTabs())

/** @type {import('vue').ComputedRef<boolean>} */
const barColor = computed(() => store.getters.getBarColor)

/**
 * @param {MouseEvent} event
 * @param {string} tabId
 */
function handleTabAuxClick(event, tabId) {
  // auxclick fires for all clicks not performed with the primary button
  // only close the tab if it was the middle button,
  // otherwise the context menu breaks
  if (event.button === 1) {
    event.preventDefault()
    closeTab(tabId)
  }
}
</script>

<style scoped lang="scss" src="./TabBar.scss" />
