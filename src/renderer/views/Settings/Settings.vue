<template>
  <div class="settingsPage">
    <template v-if="unlocked">
      <div class="settingsToolbar">
        <FtButton
          v-if="USING_ELECTRON"
          :label="t('KeyboardShortcutPrompt.Show Keyboard Shortcuts')"
          :icon="['fas', 'keyboard']"
          @click="showKeyboardShortcutPrompt"
        />
      </div>
      <FtFlexBox
        class="tabs"
        role="tablist"
        :aria-label="$t('Settings.Settings Tabs')"
      >
        <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -->
        <div
          v-for="tab in settingsTabs"
          :key="tab.type"
          :ref="(element) => setTabRef(element, tab.type)"
          class="tab"
          role="tab"
          :aria-selected="currentTab === tab.type"
          :aria-controls="`${tab.type}SettingsPanel`"
          :tabindex="currentTab === tab.type ? 0 : -1"
          :class="{ selectedTab: currentTab === tab.type }"
          @click="changeTab(tab.type)"
          @keydown.space.enter.prevent="changeTab(tab.type)"
          @keydown.left.right="focusTab($event, tab.type)"
        >
          <FontAwesomeIcon
            :icon="tab.icon"
            class="tabIcon"
          />
          {{ tab.title }}
        </div>
      </FtFlexBox>
      <div
        :id="`${currentTab}SettingsPanel`"
        class="settingsPanel"
        role="tabpanel"
      >
        <component
          :is="section.component"
          v-for="section in activeTabSections"
          :key="`${currentTab}-${section.type}`"
          class="section"
        />
      </div>
    </template>
    <PasswordDialog
      v-else
      @unlocked="handleUnlock"
    />
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import GeneralSettings from '../../components/GeneralSettings/GeneralSettings.vue'
import ThemeSettings from '../../components/ThemeSettings.vue'
import PlayerSettings from '../../components/PlayerSettings/PlayerSettings.vue'
import ExternalPlayerSettings from '../../components/ExternalPlayerSettings.vue'
import SubscriptionSettings from '../../components/SubscriptionSettings/SubscriptionSettings.vue'
import PrivacySettings from '../../components/PrivacySettings.vue'
import DataSettings from '../../components/DataSettings/DataSettings.vue'
import BackendSettings from '../../components/BackendSettings/BackendSettings.vue'
import DistractionSettings from '../../components/DistractionSettings/DistractionSettings.vue'
import ProxySettings from '../../components/ProxySettings/ProxySettings.vue'
import SponsorBlockSettings from '../../components/SponsorBlockSettings.vue'
import ParentalControlSettings from '../../components/ParentalControlSettings.vue'
import ExperimentalSettings from '../../components/ExperimentalSettings/ExperimentalSettings.vue'
import PasswordSettings from '../../components/PasswordSettings/PasswordSettings.vue'
import PasswordDialog from '../../components/PasswordDialog/PasswordDialog.vue'
import FtButton from '../../components/FtButton/FtButton.vue'
import FtFlexBox from '../../components/ft-flex-box/ft-flex-box.vue'
import AboutSettings from './AboutSettings.vue'

import store from '../../store/index'

const USING_ELECTRON = !!process.env.IS_ELECTRON

const { t } = useI18n()

/** @type {('general' | 'display' | 'data' | 'safety' | 'about')[]} */
const tabTypes = ['general', 'display', 'data', 'safety', 'about']

/**
 * @returns {'general' | 'display' | 'data' | 'safety' | 'about'}
 */
function restoreCurrentTab() {
  const savedTab = sessionStorage.getItem('Settings/currentTab')
  return tabTypes.includes(savedTab) ? savedTab : 'general'
}

/** @type {import('vue').Ref<'general' | 'display' | 'data' | 'safety' | 'about'>} */
const currentTab = ref(restoreCurrentTab())

watch(currentTab, (value) => {
  // Save last used tab, restore when view mounted again
  sessionStorage.setItem('Settings/currentTab', value)
})

const settingsTabs = computed(() => [
  {
    type: 'general',
    title: t('Settings.Tabs.General'),
    icon: ['fas', 'border-all'],
    sections: [
      { type: 'general', component: GeneralSettings },
      { type: 'subscription', component: SubscriptionSettings },
      ...(process.env.IS_ELECTRON
        ? [{
            type: 'experimental',
            component: ExperimentalSettings
          }]
        : [])
    ]
  },
  {
    type: 'display',
    title: t('Settings.Tabs.Display'),
    icon: ['fas', 'display'],
    sections: [
      { type: 'theme', component: ThemeSettings },
      { type: 'player', component: PlayerSettings },
      ...(process.env.IS_ELECTRON
        ? [{
            type: 'external-player',
            component: ExternalPlayerSettings
          }]
        : []),
      { type: 'distraction', component: DistractionSettings },
      { type: 'sponsor-block', component: SponsorBlockSettings }
    ]
  },
  {
    type: 'data',
    title: t('Settings.Tabs.Data'),
    icon: ['fas', 'database'],
    sections: [
      { type: 'data', component: DataSettings },
      { type: 'backend', component: BackendSettings },
      { type: 'privacy', component: PrivacySettings },
      ...(process.env.IS_ELECTRON
        ? [{
            type: 'proxy',
            component: ProxySettings
          }]
        : [])
    ]
  },
  {
    type: 'safety',
    title: t('Settings.Tabs.Safety'),
    icon: ['fas', 'shield'],
    sections: [
      { type: 'parental-control', component: ParentalControlSettings },
      { type: 'password', component: PasswordSettings }
    ]
  },
  {
    type: 'about',
    title: t('Settings.Tabs.About'),
    icon: ['fas', 'info-circle'],
    sections: [
      { type: 'about', component: AboutSettings }
    ]
  }
])

const activeTabSections = computed(() => {
  return settingsTabs.value.find(tab => tab.type === currentTab.value)?.sections ?? []
})

const unlocked = ref(store.getters.getSettingsPassword === '')

function handleUnlock() {
  unlocked.value = true
}

function showKeyboardShortcutPrompt() {
  store.dispatch('showKeyboardShortcutPrompt')
}

/**
 * @param {'general' | 'display' | 'data' | 'safety' | 'about'} tab
 */
function changeTab(tab) {
  if (tab === currentTab.value) {
    return
  }

  currentTab.value = tab
}

/** @type {Record<string, HTMLElement>} */
const tabRefs = {}

/**
 * @param {HTMLElement | null} element
 * @param {string} type
 */
function setTabRef(element, type) {
  if (element) {
    tabRefs[type] = element
  }
}

/**
 * @param {KeyboardEvent} event
 * @param {'general' | 'display' | 'data' | 'safety' | 'about'} focusedTab
 */
function focusTab(event, focusedTab) {
  if (event.altKey) {
    return
  }

  event.preventDefault()

  let index = tabTypes.indexOf(focusedTab)

  if (event.key === 'ArrowLeft') {
    index--
  } else {
    index++
  }

  if (index < 0) {
    index = tabTypes.length - 1
  } else if (index > tabTypes.length - 1) {
    index = 0
  }

  tabRefs[tabTypes[index]]?.focus()
  store.commit('setOutlinesHidden', false)
}
</script>

<style scoped src="./Settings.css" />
