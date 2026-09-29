<template>
  <FtSettingsSection
    :title="t('Settings.Player Settings.Player Settings')"
  >
    <div class="switchColumnGrid">
      <div class="switchColumn">
        <FtToggleSwitch
          :label="t('Settings.Player Settings.Turn on Subtitles by Default')"
          :compact="true"
          :default-value="enableSubtitlesByDefault"
          @change="updateEnableSubtitlesByDefault"
        />
        <FtToggleSwitch
          :label="t('Settings.Player Settings.Scroll Volume Over Video Player')"
          :compact="true"
          :disabled="videoSkipMouseScroll"
          :default-value="videoVolumeMouseScroll"
          @change="updateVideoVolumeMouseScroll"
        />
        <FtToggleSwitch
          :label="t('Settings.Player Settings.Scroll Playback Rate Over Video Player')"
          :compact="true"
          :default-value="videoPlaybackRateMouseScroll"
          :tooltip="t('Tooltips.Player Settings.Scroll Playback Rate Over Video Player')"
          @change="updateVideoPlaybackRateMouseScroll"
        />
        <FtToggleSwitch
          :label="t('Settings.Player Settings.Skip by Scrolling Over Video Player')"
          :compact="true"
          :disabled="videoVolumeMouseScroll"
          :default-value="videoSkipMouseScroll"
          :tooltip="t('Tooltips.Player Settings.Skip by Scrolling Over Video Player')"
          @change="updateVideoSkipMouseScroll"
        />
      </div>
      <div class="switchColumn">
        <FtToggleSwitch
          :label="t('Settings.Player Settings.Play Next Video')"
          :compact="true"
          :disabled="hideRecommendedVideos"
          :default-value="playNextVideo"
          @change="updatePlayNextVideo"
        />
        <FtToggleSwitch
          :label="t('Settings.Player Settings.Autoplay Playlists')"
          :compact="true"
          :default-value="autoplayPlaylists"
          @change="updateAutoplayPlaylists"
        />
        <FtToggleSwitch
          :label="t('Settings.Player Settings.Autoplay Videos')"
          :compact="true"
          :default-value="autoplayVideos"
          @change="updateAutoplayVideos"
        />
        <FtToggleSwitch
          :label="t('Settings.Player Settings.Display Play Button In Video Player')"
          :compact="true"
          :default-value="displayVideoPlayButton"
          @change="updateDisplayVideoPlayButton"
        />
        <FtToggleSwitch
          :label="t('Settings.Player Settings.Enter Fullscreen on Display Rotate')"
          :compact="true"
          :default-value="enterFullscreenOnDisplayRotate"
          @change="updateEnterFullscreenOnDisplayRotate"
        />
      </div>
    </div>
    <FtFlexBox>
      <FtSelect
        :placeholder="t('Settings.Player Settings.Default Viewing Mode.Default Viewing Mode')"
        :value="defaultViewingMode"
        :select-names="viewingModeNames"
        :select-values="viewingModeValues"
        :tooltip="t('Settings.Player Settings.Default Viewing Mode.Tooltip')"
        :icon="['fas', 'expand']"
        @change="updateDefaultViewingMode"
      />
      <FtSelect
        :placeholder="t('Settings.Player Settings.Default Video Format.Default Video Format')"
        :value="defaultVideoFormat"
        :select-names="formatNames"
        :select-values="FORMAT_VALUES"
        :tooltip="t('Tooltips.Player Settings.Default Video Format')"
        :icon="['fas', 'file-video']"
        @change="updateDefaultVideoFormat"
      />
      <FtSelect
        :placeholder="t('Settings.Player Settings.Default Quality.Default Quality')"
        :value="defaultQuality"
        :select-names="qualityNames"
        :select-values="QUALITY_VALUES"
        :icon="['fas', 'photo-film']"
        @change="updateDefaultQuality"
      />
      <FtSelect
        :placeholder="t('Settings.Player Settings.Video Playback Rate Interval')"
        :value="videoPlaybackRateIntervalString"
        :select-names="PLAYBACK_RATE_INTERVAL_VALUES"
        :select-values="PLAYBACK_RATE_INTERVAL_VALUES"
        :icon="['fas', 'gauge']"
        @change="updateVideoPlaybackRateInterval"
      />
    </FtFlexBox>
    <FtFlexBox>
      <FtSlider
        :label="t('Settings.Player Settings.Next Video Interval')"
        :default-value="defaultInterval"
        :min-value="0"
        :max-value="60"
        :step="1"
        value-extension="s"
        @change="updateDefaultInterval"
      />
      <FtSlider
        :label="t('Settings.Player Settings.Autoplay Interruption Timer')"
        :default-value="defaultAutoplayInterruptionIntervalHours"
        :min-value="1"
        :max-value="12"
        :step="1"
        value-extension="h"
        @change="updateDefaultAutoplayInterruptionIntervalHours"
      />
      <FtSlider
        :label="t('Settings.Player Settings.Fast-Forward / Rewind Interval')"
        :default-value="defaultSkipInterval"
        :min-value="1"
        :max-value="70"
        :step="1"
        value-extension="s"
        @change="updateDefaultSkipInterval"
      />
      <FtSlider
        :label="t('Settings.Player Settings.Default Volume')"
        :default-value="defaultVolume"
        :min-value="0"
        :max-value="100"
        :step="1"
        value-extension="%"
        @change="updateDefaultVolume"
      />
      <FtSlider
        :label="t('Settings.Player Settings.Default Playback Rate')"
        :default-value="defaultPlayback"
        :min-value="videoPlaybackRateInterval"
        :max-value="maxVideoPlaybackRate"
        :step="videoPlaybackRateInterval"
        value-extension="x"
        @change="updateDefaultPlayback"
      />
      <FtSlider
        :label="t('Settings.Player Settings.Max Video Playback Rate')"
        :default-value="maxVideoPlaybackRate"
        :min-value="2"
        :max-value="10"
        :step="1"
        value-extension="x"
        @change="updateMaxVideoPlaybackRate"
      />
    </FtFlexBox>
  </FtSettingsSection>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtSelect from '../FtSelect/FtSelect.vue'
import FtToggleSwitch from '../FtToggleSwitch/FtToggleSwitch.vue'
import FtSlider from '../FtSlider/FtSlider.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'

import store from '../../store/index'

const { t } = useI18n()

/** @type {import('vue').ComputedRef<boolean>} */
const enableSubtitlesByDefault = computed(() => store.getters.getEnableSubtitlesByDefault)

/**
 * @param {boolean} value
 */
function updateEnableSubtitlesByDefault(value) {
  store.dispatch('updateEnableSubtitlesByDefault', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const videoVolumeMouseScroll = computed(() => store.getters.getVideoVolumeMouseScroll)

/**
 * @param {boolean} value
 */
function updateVideoVolumeMouseScroll(value) {
  store.dispatch('updateVideoVolumeMouseScroll', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const videoPlaybackRateMouseScroll = computed(() => store.getters.getVideoPlaybackRateMouseScroll)

/**
 * @param {boolean} value
 */
function updateVideoPlaybackRateMouseScroll(value) {
  store.dispatch('updateVideoPlaybackRateMouseScroll', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const videoSkipMouseScroll = computed(() => store.getters.getVideoSkipMouseScroll)

/**
 * @param {boolean} value
 */
function updateVideoSkipMouseScroll(value) {
  store.dispatch('updateVideoSkipMouseScroll', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const playNextVideo = computed(() => store.getters.getPlayNextVideo)

/**
 * @param {boolean} value
 */
function updatePlayNextVideo(value) {
  store.dispatch('updatePlayNextVideo', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const hideRecommendedVideos = computed(() => store.getters.getHideRecommendedVideos)

/** @type {import('vue').ComputedRef<boolean>} */
const autoplayPlaylists = computed(() => store.getters.getAutoplayPlaylists)

/**
 * @param {boolean} value
 */
function updateAutoplayPlaylists(value) {
  store.dispatch('updateAutoplayPlaylists', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const autoplayVideos = computed(() => store.getters.getAutoplayVideos)

/**
 * @param {boolean} value
 */
function updateAutoplayVideos(value) {
  store.dispatch('updateAutoplayVideos', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const displayVideoPlayButton = computed(() => store.getters.getDisplayVideoPlayButton)

/**
 * @param {boolean} value
 */
function updateDisplayVideoPlayButton(value) {
  store.dispatch('updateDisplayVideoPlayButton', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const enterFullscreenOnDisplayRotate = computed(() => store.getters.getEnterFullscreenOnDisplayRotate)

/**
 * @param {boolean} value
 */
function updateEnterFullscreenOnDisplayRotate(value) {
  store.dispatch('updateEnterFullscreenOnDisplayRotate', value)
}

/** @type {import('vue').ComputedRef<string>} */
const externalPlayer = computed(() => store.getters.getExternalPlayer)

const defaultViewingMode = computed(() => {
  /** @type {'default' | 'theatre' | 'fullwindow' | 'fullscreen' | 'pip' | 'external_player'} */
  const defaultViewingMode = store.getters.getDefaultViewingMode

  if ((defaultViewingMode === 'external_player' && (!process.env.IS_ELECTRON || externalPlayer.value === '')) ||
    (!process.env.IS_ELECTRON && (defaultViewingMode === 'fullscreen' || defaultViewingMode === 'pip'))) {
    return 'default'
  }

  return defaultViewingMode
})

const viewingModeNames = computed(() => {
  const viewingModeNames = [
    t('Settings.General Settings.Thumbnail Preference.Default'),
    t('Settings.Player Settings.Default Viewing Mode.Theater'),
    t('Video.Player.Full Window'),
    t('Settings.Player Settings.Default Viewing Mode.Full Window (Always On)'),

    ...process.env.IS_ELECTRON
      ? [
          t('Settings.Player Settings.Default Viewing Mode.Full Screen'),
          t('Settings.Player Settings.Default Viewing Mode.Full Screen (Always On)'),
          t('Settings.Player Settings.Default Viewing Mode.Picture in Picture')
        ]
      : []
  ]

  if (process.env.IS_ELECTRON && externalPlayer.value !== '') {
    viewingModeNames.push(
      t('Settings.Player Settings.Default Viewing Mode.External Player', { externalPlayerName: externalPlayer.value })
    )
  }

  return viewingModeNames
})

const viewingModeValues = computed(() => {
  const viewingModeValues = [
    'default',
    'theatre',
    'fullwindow',
    'fullwindow_always_on',

    ...process.env.IS_ELECTRON
      ? [
          'fullscreen',
          'fullscreen_always_on',
          'pip',
        ]
      : []
  ]

  if (process.env.IS_ELECTRON && externalPlayer.value !== '') {
    viewingModeValues.push('external_player')
  }

  return viewingModeValues
})

/**
 * @param {'default' | 'theatre' | 'fullwindow' | 'fullscreen' | 'pip' | 'external_player'} value
 */
function updateDefaultViewingMode(value) {
  store.dispatch('updateDefaultViewingMode', value)
}

const FORMAT_VALUES = ['dash', 'legacy', 'audio']

const formatNames = computed(() => [
  t('Settings.Player Settings.Default Video Format.Dash Formats'),
  t('Settings.Player Settings.Default Video Format.Legacy Formats'),
  t('Settings.Player Settings.Default Video Format.Audio Formats')
])

/** @type {import('vue').ComputedRef<'dash' | 'audio' |' legacy'>} */
const defaultVideoFormat = computed(() => store.getters.getDefaultVideoFormat)

/**
 * @param {'dash' | 'legacy' | 'audio'} value
 */
function updateDefaultVideoFormat(value) {
  store.dispatch('updateDefaultVideoFormat', value)
}

// TODO: Revert when auto is fixed
// const QUALITY_VALUES = ['2160', '1440', '1080', '720', '480', '360', '240', '144', 'auto']
const QUALITY_VALUES = ['2160', '1440', '1080', '720', '480', '360', '240', '144']

const qualityNames = computed(() => [
  t('Settings.Player Settings.Default Quality.4k'),
  t('Settings.Player Settings.Default Quality.1440p'),
  t('Settings.Player Settings.Default Quality.1080p'),
  t('Settings.Player Settings.Default Quality.720p'),
  t('Settings.Player Settings.Default Quality.480p'),
  t('Settings.Player Settings.Default Quality.360p'),
  t('Settings.Player Settings.Default Quality.240p'),
  t('Settings.Player Settings.Default Quality.144p'),

  // TODO: Revert when auto is fixed
  // t('Settings.Player Settings.Default Quality.Auto')
])

/** @type {import('vue').ComputedRef<'2160' | '1440' | '1080' | '720' | '480' | '360' | '240' | '144' | 'auto'>} */
const defaultQuality = computed(() => {
  const value = store.getters.getDefaultQuality

  // TODO: Revert when auto is fixed (720 is the default setttings value)
  if (value === 'auto') { return '720' }

  return value
})

/**
 * @param {'2160' | '1440' | '1080' | '720' | '480' | '360' | '240' | '144' | 'auto'} value
 */
function updateDefaultQuality(value) {
  store.dispatch('updateDefaultQuality', value)
}

const PLAYBACK_RATE_INTERVAL_VALUES = ['0.1', '0.25', '0.5', '1']

/** @type {import('vue').ComputedRef<number>} */
const videoPlaybackRateInterval = computed(() => store.getters.getVideoPlaybackRateInterval)

/** @type {import('vue').ComputedRef<string>} */
const videoPlaybackRateIntervalString = computed(() => store.getters.getVideoPlaybackRateInterval.toString())

/**
 * @param {string} value
 */
function updateVideoPlaybackRateInterval(value) {
  store.dispatch('updateVideoPlaybackRateInterval', parseFloat(value))
}

/** @type {import('vue').ComputedRef<number>} */
const defaultInterval = computed(() => store.getters.getDefaultInterval)

/**
 * @param {number} value
 */
function updateDefaultInterval(value) {
  store.dispatch('updateDefaultInterval', value)
}

/** @type {import('vue').ComputedRef<number>} */
const defaultAutoplayInterruptionIntervalHours = computed(() => {
  return store.getters.getDefaultAutoplayInterruptionIntervalHours
})

/**
 * @param {number} value
 */
function updateDefaultAutoplayInterruptionIntervalHours(value) {
  store.dispatch('updateDefaultAutoplayInterruptionIntervalHours', value)
}

/** @type {import('vue').ComputedRef<number>} */
const defaultSkipInterval = computed(() => store.getters.getDefaultSkipInterval)

/**
 * @param {number} value
 */
function updateDefaultSkipInterval(value) {
  store.dispatch('updateDefaultSkipInterval', value)
}

/** @type {import('vue').ComputedRef<number>} */
const defaultVolume = computed(() => Math.round(store.getters.getDefaultVolume * 100))

/**
 * @param {number} value
 */
function updateDefaultVolume(value) {
  store.dispatch('updateDefaultVolume', value / 100)
}

/** @type {import('vue').ComputedRef<number>} */
const defaultPlayback = computed(() => store.getters.getDefaultPlayback)

/**
 * @param {number} value
 */
function updateDefaultPlayback(value) {
  store.dispatch('updateDefaultPlayback', value)
}

/** @type {import('vue').ComputedRef<number>} */
const maxVideoPlaybackRate = computed(() => store.getters.getMaxVideoPlaybackRate)

/**
 * @param {number} value
 */
function updateMaxVideoPlaybackRate(value) {
  store.dispatch('updateMaxVideoPlaybackRate', value)
}
</script>
