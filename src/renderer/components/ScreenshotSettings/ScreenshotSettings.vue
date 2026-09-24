<template>
  <FtSettingsSection
    :title="t('Settings.Screenshot Settings.Screenshot Settings')"
  >
    <FtFlexBox>
      <FtToggleSwitch
        :label="t('Settings.Player Settings.Screenshot.Enable')"
        :default-value="enableScreenshot"
        @change="updateEnableScreenshot"
      />
    </FtFlexBox>
    <div v-if="enableScreenshot">
      <FtFlexBox>
        <FtSelect
          :placeholder="t('Settings.Player Settings.Screenshot.Mode')"
          :value="screenshotMode"
          :select-names="screenshotModeNames"
          :select-values="screenshotModeValues"
          :icon="['fas', 'expand']"
          @change="handleUpdateScreenshotMode"
        />
      </FtFlexBox>
      <FtFlexBox v-if="screenshotMode !== 'clipboard'">
        <FtSelect
          :placeholder="t('Settings.Player Settings.Screenshot.Format Label')"
          :value="screenshotFormat"
          :select-names="SCREENSHOT_FORMAT_NAMES"
          :select-values="SCREENSHOT_FORMAT_VALUES"
          :icon="['fas', 'file-image']"
          @change="handleUpdateScreenshotFormat"
        />
        <FtSlider
          :label="t('Settings.Player Settings.Screenshot.Quality Label')"
          :default-value="screenshotQuality"
          :min-value="0"
          :max-value="100"
          :step="1"
          value-extension="%"
          :disabled="screenshotFormat === 'png'"
          @change="updateScreenshotQuality"
        />
      </FtFlexBox>
      <FtFlexBox
        v-if="USING_ELECTRON && screenshotMode === 'default_folder'"
        class="screenshotFolderContainer"
      >
        <p class="screenshotFolderLabel">
          {{ t('Settings.Player Settings.Screenshot.Folder Label') }}
        </p>
        <FtInput
          class="screenshotFolderPath"
          :placeholder="screenshotFolder"
          :show-action-button="false"
          :show-label="false"
          :disabled="true"
        />
        <FtButton
          :label="t('Settings.Player Settings.Screenshot.Folder Button')"
          class="screenshotFolderButton"
          @click="chooseScreenshotFolder"
        />
      </FtFlexBox>
      <FtFlexBox
        v-if="screenshotMode !== 'clipboard'"
        class="screenshotFolderContainer"
      >
        <p class="screenshotFilenamePatternTitle">
          {{ t('Settings.Player Settings.Screenshot.File Name Label') }}
          <FtTooltip
            class="selectTooltip"
            position="bottom"
            :tooltip="t('Settings.Player Settings.Screenshot.File Name Tooltip')"
          />
        </p>
        <FtInput
          class="screenshotFilenamePatternInput"
          placeholder=""
          :value="screenshotFilenamePattern"
          :show-action-button="false"
          :show-label="false"
          @input="handleScreenshotFilenamePatternChanged"
        />
        <FtInput
          class="screenshotFilenamePatternExample"
          :placeholder="screenshotFilenameExample"
          :show-action-button="false"
          :show-label="false"
          :disabled="true"
        />
      </FtFlexBox>
      <br>
    </div>
  </FtSettingsSection>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtSelect from '../FtSelect/FtSelect.vue'
import FtToggleSwitch from '../FtToggleSwitch/FtToggleSwitch.vue'
import FtSlider from '../FtSlider/FtSlider.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtButton from '../FtButton/FtButton.vue'
import FtInput from '../FtInput/FtInput.vue'
import FtTooltip from '../FtTooltip/FtTooltip.vue'

import store from '../../store/index'

const { t } = useI18n()

/** @type {boolean} */
const USING_ELECTRON = process.env.IS_ELECTRON

/** @type {import('vue').ComputedRef<boolean>} */
const enableScreenshot = computed(() => store.getters.getEnableScreenshot)

/**
 * @param {boolean} value
 */
function updateEnableScreenshot(value) {
  store.dispatch('updateEnableScreenshot', value)
}

const SCREENSHOT_FORMAT_NAMES = ['PNG', 'JPEG', 'WebP']
const SCREENSHOT_FORMAT_VALUES = ['png', 'jpeg', 'webp']

/** @type {import('vue').ComputedRef<'png' | 'jpeg' | 'webp'>} */
const screenshotFormat = computed(() => store.getters.getScreenshotFormat)

/**
 * @param {'png' | 'jpeg' | 'webp'} format
 */
async function handleUpdateScreenshotFormat(format) {
  await store.dispatch('updateScreenshotFormat', format)
  getScreenshotFilenameExample(screenshotFilenamePattern.value)
}

const screenshotModeNames = computed(() => [
  t('Settings.Player Settings.Screenshot.Modes.Ask Path'),
  ...process.env.IS_ELECTRON ? [t('Settings.Player Settings.Screenshot.Modes.Save To Folder')] : [],
  t('Settings.Player Settings.Screenshot.Modes.Clipboard'),
])
const screenshotModeValues = computed(() => [
  'prompt_folder',
  ...process.env.IS_ELECTRON ? ['default_folder'] : [],
  'clipboard'
])

/** @type {import('vue').ComputedRef<'prompt_folder' | 'default_folder' | 'clipboard'>} */
const screenshotMode = computed(() => store.getters.getScreenshotMode)

/**
 * @param {'prompt_folder' | 'default_folder' | 'clipboard'} mode
 */
async function handleUpdateScreenshotMode(mode) {
  await store.dispatch('updateScreenshotMode', mode)
}

/** @type {import('vue').ComputedRef<number>} */
const screenshotQuality = computed(() => store.getters.getScreenshotQuality)

/**
 * @param {number} value
 */
function updateScreenshotQuality(value) {
  store.dispatch('updateScreenshotQuality', value)
}

/** @type {import('vue').ComputedRef<string>} */
const screenshotFolder = computed(() => store.getters.getScreenshotFolderPath)

function chooseScreenshotFolder() {
  // only use with electron
  if (process.env.IS_ELECTRON) {
    window.ftElectron.chooseDefaultFolder()
  }
}

/** @type {import('vue').ComputedRef<string>} */
const screenshotFilenamePattern = computed(() => store.getters.getScreenshotFilenamePattern)

onMounted(() => {
  getScreenshotFilenameExample(screenshotFilenamePattern.value)
})

const SCREENSHOT_DEFAULT_PATTERN = '%Y%M%D-%H%N%S'

/**
 * @param {string} input
 */
async function handleScreenshotFilenamePatternChanged(input) {
  const pattern = input.trim()

  if (!await getScreenshotFilenameExample(pattern)) {
    return
  }

  store.dispatch('updateScreenshotFilenamePattern', pattern || SCREENSHOT_DEFAULT_PATTERN)
}

const screenshotFilenameExample = ref('')

/**
 * @param {string} pattern
 */
async function getScreenshotFilenameExample(pattern) {
  try {
    const filename = await store.dispatch('parseScreenshotCustomFileName', {
      pattern: pattern || SCREENSHOT_DEFAULT_PATTERN,
      date: new Date(),
      playerTime: 123.456,
      videoId: 'dQw4w9WgXcQ'
    })

    screenshotFilenameExample.value = `${filename}.${screenshotFormat.value}`
    return true
  } catch (err) {
    screenshotFilenameExample.value = `❗ ${err.message}`
    return false
  }
}
</script>

<style scoped src="./ScreenshotSettings.css" />
