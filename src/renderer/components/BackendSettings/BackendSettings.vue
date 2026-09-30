<template>
  <FtSettingsSection
    :title="t('Settings.Backend Settings.Backend Settings')"
  >
    <FtSettingsTable>
      <FtSettingsTableRow
        :label="t('Settings.Backend Settings.API Backend')"
        :tooltip="t('Tooltips.Backend Settings.API Backend')"
      >
        <FtSelect
          :placeholder="t('Settings.Backend Settings.API Backend')"
          :value="backendPreference"
          :select-names="apiBackendNames"
          :select-values="BACKEND_VALUES"
          :tooltip="t('Tooltips.Backend Settings.API Backend')"
          :icon="['fas', 'server']"
          @change="updateBackendPreference"
        />
        <FtToggleSwitch
          v-if="showApiBackendFallback"
          :label="t('Settings.Backend Settings.Allow Fallback to Direct YouTube for API')"
          :default-value="backendFallback"
          :compact="true"
          :tooltip="t('Tooltips.Backend Settings.Allow Fallback to Direct YouTube for API')"
          @change="updateBackendFallback"
        />
      </FtSettingsTableRow>
      <FtSettingsTableRow
        v-if="SUPPORTS_LOCAL_API"
        :label="t('Settings.Backend Settings.Video Backend')"
        :tooltip="t('Tooltips.Backend Settings.Video Backend')"
      >
        <FtSelect
          :placeholder="t('Settings.Backend Settings.Video Backend')"
          :value="videoBackendPreference"
          :select-names="videoBackendNames"
          :select-values="BACKEND_VALUES"
          :tooltip="t('Tooltips.Backend Settings.Video Backend')"
          :icon="['fas', 'circle-play']"
          @change="updateVideoBackendPreference"
        />
        <FtToggleSwitch
          v-if="showVideoBackendFallback"
          :label="t('Settings.Backend Settings.Allow Fallback to Direct YouTube for Video')"
          :default-value="videoBackendFallback"
          :compact="true"
          :tooltip="t('Tooltips.Backend Settings.Allow Fallback to Direct YouTube for Video')"
          @change="updateVideoBackendFallback"
        />
      </FtSettingsTableRow>
      <FtSettingsTableRow
        v-if="usesInvidious"
        :label="t('Settings.Backend Settings.Current Invidious Instance')"
        :tooltip="t('Tooltips.General Settings.Invidious Instance')"
      >
        <FtInput
          ref="currentInvidiousInstanceInput"
          class="instanceInput"
          :placeholder="t('Settings.General Settings.Current Invidious Instance')"
          :show-action-button="false"
          :show-label="false"
          :value="currentInvidiousInstance"
          :data-list="invidiousInstancesList"
          @blur="handleInvidiousInstanceBlur"
        />
        <a
          class="instanceInfoLink"
          href="https://api.invidious.io"
        >
          {{ t('Settings.General Settings.View all Invidious instance information') }}
        </a>
      </FtSettingsTableRow>
      <FtSettingsTableRow
        v-if="usesInvidious"
        :label="t('Settings.Backend Settings.Instance Health')"
        :tooltip="t('Tooltips.Backend Settings.Instance Health')"
      >
        <InstanceHealthCheck
          :instance="currentInvidiousInstance"
          :proxies-videos="proxiesVideosThroughInvidious"
        />
      </FtSettingsTableRow>
      <FtSettingsTableRow
        v-if="usesInvidious"
        :label="t('Settings.Backend Settings.Default Invidious Instance')"
      >
        <p v-if="defaultInvidiousInstance !== ''">
          {{ t('Settings.General Settings.The currently set default instance is {instance}', { instance: defaultInvidiousInstance }) }}
        </p>
        <template v-else>
          <p>
            {{ t('Settings.General Settings.No default instance has been set') }}
          </p>
          <p>
            {{ t('Settings.General Settings.Current instance will be randomized on startup') }}
          </p>
        </template>
        <FtButton
          :label="t('Settings.General Settings.Set Current Instance as Default')"
          @click="handleSetDefaultInstanceClick"
        />
        <FtButton
          :label="t('Settings.General Settings.Clear Default Instance')"
          @click="handleClearDefaultInstanceClick"
        />
      </FtSettingsTableRow>
    </FtSettingsTable>
  </FtSettingsSection>
</template>

<script setup>
import { computed, onBeforeUnmount, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtSettingsTable from '../FtSettingsTable/FtSettingsTable.vue'
import FtSettingsTableRow from '../FtSettingsTableRow/FtSettingsTableRow.vue'
import InstanceHealthCheck from '../InstanceHealthCheck/InstanceHealthCheck.vue'
import FtSelect from '../FtSelect/FtSelect.vue'
import FtInput from '../FtInput/FtInput.vue'
import FtButton from '../FtButton/FtButton.vue'
import FtToggleSwitch from '../FtToggleSwitch/FtToggleSwitch.vue'

import store from '../../store/index'

import { randomArrayItem, showToast } from '../../helpers/utils'

const currentInvidiousInstanceInputRef = useTemplateRef('currentInvidiousInstanceInput')

const { t } = useI18n()

const SUPPORTS_LOCAL_API = !!process.env.SUPPORTS_LOCAL_API

const BACKEND_VALUES = process.env.SUPPORTS_LOCAL_API
  ? ['invidious', 'local']
  : ['invidious']

/** @type {import('vue').ComputedRef<string[]>} */
const apiBackendNames = computed(() => {
  if (process.env.SUPPORTS_LOCAL_API) {
    return [
      t('Settings.General Settings.Preferred API Backend.Invidious API'),
      t('Settings.General Settings.Preferred API Backend.Direct YouTube')
    ]
  } else {
    return [
      t('Settings.General Settings.Preferred API Backend.Invidious API')
    ]
  }
})

/** @type {import('vue').ComputedRef<string[]>} */
const videoBackendNames = computed(() => apiBackendNames.value)

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => store.getters.getBackendPreference)

/**
 * @param {'local' | 'invidious'} value
 */
function updateBackendPreference(value) {
  store.dispatch('updateBackendPreference', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const backendFallback = computed(() => store.getters.getBackendFallback)

/**
 * The fallback is only consulted when Invidious is the API backend, so there is
 * nothing to fall back from once the local API is preferred
 * @type {import('vue').ComputedRef<boolean>}
 */
const showApiBackendFallback = computed(() => backendPreference.value === 'invidious')

/**
 * @param {boolean} value
 */
function updateBackendFallback(value) {
  store.dispatch('updateBackendFallback', value)
}

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const videoBackendPreference = computed(() => store.getters.getVideoBackendPreference)

/**
 * @param {'local' | 'invidious'} value
 */
function updateVideoBackendPreference(value) {
  store.dispatch('updateVideoBackendPreference', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const videoBackendFallback = computed(() => store.getters.getVideoBackendFallback)

/**
 * Same as above, but for the video backend: with the local API selected there is
 * no Invidious request left to fall back from
 * @type {import('vue').ComputedRef<boolean>}
 */
const showVideoBackendFallback = computed(() => videoBackendPreference.value === 'invidious')

/**
 * @param {boolean} value
 */
function updateVideoBackendFallback(value) {
  store.dispatch('updateVideoBackendFallback', value)
}

/**
 * The Invidious instance is shared by both backends, so it has to stay visible
 * whenever either of them, or either fallback, could end up talking to Invidious
 * @type {import('vue').ComputedRef<boolean>}
 */
const usesInvidious = computed(() => {
  return backendPreference.value === 'invidious' ||
    backendFallback.value ||
    videoBackendPreference.value === 'invidious' ||
    videoBackendFallback.value
})

/**
 * Mirrors how Watch.js decides to route streams through the instance, so that
 * the video check measures the same thing that playback would
 * @type {import('vue').ComputedRef<boolean>}
 */
const proxiesVideosThroughInvidious = computed(() => videoBackendPreference.value === 'invidious')

/** @type {import('vue').ComputedRef<string[]>} */
const invidiousInstancesList = computed(() => store.getters.getInvidiousInstancesList)

/** @type {import('vue').ComputedRef<string>} */
const currentInvidiousInstance = computed(() => store.getters.getCurrentInvidiousInstance)

onBeforeUnmount(() => {
  if (currentInvidiousInstance.value === '') {
    // FIXME: If we call an action from here, there's no guarantee it will finish
    // before the component is destroyed, which could bring up some problems
    // Since I can't see any way to await it (because lifecycle hooks must be
    // synchronous), unfortunately, we have to copy/paste the logic
    // from the `setRandomCurrentInvidiousInstance` action onto here
    // Fix when we migrate to Pinia
    const instanceList = invidiousInstancesList.value
    store.commit('setCurrentInvidiousInstance', randomArrayItem(instanceList))
  }
})

/**
 * @param {string} input
 */
function handleInvidiousInstanceBlur(input) {
  let instance = input
  // If NOT something like https:// (1-2 slashes), remove trailing slash
  if (!/^https?:\/{1,2}$/.test(input)) {
    instance = input.replace(/\/+$/, '')
  }

  store.commit('setCurrentInvidiousInstance', instance)
  if (instance !== input) {
    currentInvidiousInstanceInputRef.value?.setText(instance)
  }
}

/** @type {import('vue').ComputedRef<string>} */
const defaultInvidiousInstance = computed(() => store.getters.getDefaultInvidiousInstance)

function handleSetDefaultInstanceClick() {
  const instance = currentInvidiousInstance.value
  store.dispatch('updateDefaultInvidiousInstance', instance)

  const message = t('Default Invidious instance has been set to {instance}', { instance })
  showToast(message)
}

function handleClearDefaultInstanceClick() {
  store.dispatch('updateDefaultInvidiousInstance', '')
  showToast(t('Default Invidious instance has been cleared'))
}
</script>

<style scoped src="./BackendSettings.css" />
