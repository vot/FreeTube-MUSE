<template>
  <FtSettingsSection
    :title="t('Settings.Backend Settings.Backend Settings')"
  >
    <div class="switchGrid">
      <FtSelect
        :placeholder="t('Settings.General Settings.Preferred API Backend.Preferred API Backend')"
        :value="backendPreference"
        :select-names="backendNames"
        :select-values="BACKEND_VALUES"
        :tooltip="t('Tooltips.General Settings.Preferred API Backend')"
        :icon="['fas', 'server']"
        @change="updateBackendPreference"
      />
    </div>
    <div
      v-if="backendPreference === 'invidious' || backendFallback"
    >
      <FtFlexBox class="settingsFlexStart460px">
        <FtInput
          ref="currentInvidiousInstanceInput"
          :placeholder="t('Settings.General Settings.Current Invidious Instance')"
          :show-action-button="false"
          :show-label="true"
          :value="currentInvidiousInstance"
          :data-list="invidiousInstancesList"
          :tooltip="t('Tooltips.General Settings.Invidious Instance')"
          @blur="handleInvidiousInstanceBlur"
        />
      </FtFlexBox>
      <FtFlexBox>
        <div>
          <a
            href="https://api.invidious.io"
          >
            {{ t('Settings.General Settings.View all Invidious instance information') }}
          </a>
        </div>
      </FtFlexBox>
      <p
        v-if="defaultInvidiousInstance !== ''"
        class="center"
      >
        {{ t('Settings.General Settings.The currently set default instance is {instance}', { instance: defaultInvidiousInstance }) }}
      </p>
      <template v-else>
        <p class="center">
          {{ t('Settings.General Settings.No default instance has been set') }}
        </p>
        <p class="center">
          {{ t('Settings.General Settings.Current instance will be randomized on startup') }}
        </p>
      </template>
      <FtFlexBox>
        <FtButton
          :label="t('Settings.General Settings.Set Current Instance as Default')"
          @click="handleSetDefaultInstanceClick"
        />
        <FtButton
          :label="t('Settings.General Settings.Clear Default Instance')"
          @click="handleClearDefaultInstanceClick"
        />
      </FtFlexBox>
    </div>
  </FtSettingsSection>
</template>

<script setup>
import { computed, onBeforeUnmount, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtSelect from '../FtSelect/FtSelect.vue'
import FtInput from '../FtInput/FtInput.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtButton from '../FtButton/FtButton.vue'

import store from '../../store/index'

import { randomArrayItem, showToast } from '../../helpers/utils'

const currentInvidiousInstanceInputRef = useTemplateRef('currentInvidiousInstanceInput')

const { t } = useI18n()

const BACKEND_VALUES = process.env.SUPPORTS_LOCAL_API
  ? ['invidious', 'local']
  : ['invidious']

const backendNames = computed(() => {
  if (process.env.SUPPORTS_LOCAL_API) {
    return [
      t('Settings.General Settings.Preferred API Backend.Invidious API'),
      t('Settings.General Settings.Preferred API Backend.Local API')
    ]
  } else {
    return [
      t('Settings.General Settings.Preferred API Backend.Invidious API')
    ]
  }
})

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
