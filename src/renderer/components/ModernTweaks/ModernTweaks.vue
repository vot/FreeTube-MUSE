<template>
  <FtSettingsSection :title="t('Settings.Modern Tweaks.Modern Tweaks')">
    <div class="switchColumnGrid">
      <div class="switchColumn">
        <FtToggleSwitch
          :label="t('Settings.General Settings.Enable Tabbed Interface')"
          :default-value="enableTabbedInterface"
          :compact="true"
          :tooltip="t('Tooltips.General Settings.Enable Tabbed Interface')"
          @change="updateEnableTabbedInterface"
        />
        <FtToggleSwitch
          v-if="enableTabbedInterface"
          :label="t('Settings.General Settings.Open All Video Links In New Tabs')"
          :default-value="openAllVideoLinksInNewTabs"
          :compact="true"
          :tooltip="t('Tooltips.General Settings.Open All Video Links In New Tabs')"
          @change="updateOpenAllVideoLinksInNewTabs"
        />
      </div>
    </div>
    <FtSettingsTable>
      <FtSettingsTableRow
        :label="t('Settings.Player Settings.Subtitles Size.Subtitles Size')"
        :tooltip="t('Tooltips.Player Settings.Subtitles Size')"
      >
        <FtSelect
          :placeholder="t('Settings.Player Settings.Subtitles Size.Subtitles Size')"
          :value="subtitleSize"
          :select-names="subtitleSizeNames"
          :select-values="SUBTITLE_SIZE_VALUES"
          :tooltip="t('Tooltips.Player Settings.Subtitles Size')"
          :icon="['fas', 'font']"
          @change="updateSubtitleSize"
        />
      </FtSettingsTableRow>
    </FtSettingsTable>
  </FtSettingsSection>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtSettingsTable from '../FtSettingsTable/FtSettingsTable.vue'
import FtSettingsTableRow from '../FtSettingsTableRow/FtSettingsTableRow.vue'
import FtSelect from '../FtSelect/FtSelect.vue'
import FtToggleSwitch from '../FtToggleSwitch/FtToggleSwitch.vue'

import store from '../../store/index'

const { t } = useI18n()

/** @type {import('vue').ComputedRef<boolean>} */
const enableTabbedInterface = computed(() => store.getters.getEnableTabbedInterface)

/**
 * @param {boolean} value
 */
function updateEnableTabbedInterface(value) {
  store.dispatch('updateEnableTabbedInterface', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const openAllVideoLinksInNewTabs = computed(() => store.getters.getOpenAllVideoLinksInNewTabs)

/**
 * @param {boolean} value
 */
function updateOpenAllVideoLinksInNewTabs(value) {
  store.dispatch('updateOpenAllVideoLinksInNewTabs', value)
}

const SUBTITLE_SIZE_VALUES = ['smallest', 'small', 'normal', 'large', 'largest']

const subtitleSizeNames = computed(() => [
  t('Settings.Player Settings.Subtitles Size.Smallest'),
  t('Settings.Player Settings.Subtitles Size.Small'),
  t('Settings.Player Settings.Subtitles Size.Normal'),
  t('Settings.Player Settings.Subtitles Size.Large'),
  t('Settings.Player Settings.Subtitles Size.Largest')
])

/** @type {import('vue').ComputedRef<'smallest' | 'small' | 'normal' | 'large' | 'largest'>} */
const subtitleSize = computed(() => store.getters.getSubtitleSize)

/**
 * @param {'smallest' | 'small' | 'normal' | 'large' | 'largest'} value
 */
function updateSubtitleSize(value) {
  store.dispatch('updateSubtitleSize', value)
}
</script>

<style scoped src="./ModernTweaks.css" />
