<template>
  <FtSettingsSection
    :title="t('Settings.Hide Content Settings.Hide Content Settings')"
  >
    <FtFlexBox>
      <FtInputTags
        :disabled="channelHiderDisabled"
        :disabled-msg="t('Settings.Distraction Free Settings.Hide Channels Disabled Message')"
        :label="t('Settings.Distraction Free Settings.Hide Channels')"
        :tag-name-placeholder="t('Settings.Distraction Free Settings.Hide Channels Placeholder')"
        :tag-list="channelsHidden"
        :tooltip="t('Tooltips.Distraction Free Settings.Hide Channels')"
        :validate-tag-name="checkYoutubeChannelId"
        :find-tag-info="findChannelTagInfoWrapper"
        :are-channel-tags="true"
        :show-tags="showAddedChannelsHidden"
        @invalid-name="handleInvalidChannel"
        @error-find-tag-info="handleChannelAPIError"
        @change="handleChannelsHidden"
        @already-exists="handleChannelsExists"
        @toggle-show-tags="handleAddedChannelsHidden"
      />
    </FtFlexBox>
    <FtFlexBox class="containingTextFlexBox">
      <FtInputTags
        :label="t('Settings.Distraction Free Settings.Hide Videos, Playlists and Channels Containing Text')"
        :tag-name-placeholder="t('Settings.Distraction Free Settings.Hide Videos, Playlists and Channels Containing Text Placeholder')"
        :show-tags="showAddedForbiddenTitles"
        :tag-list="forbiddenTitles"
        :min-input-length="1"
        :tooltip="t('Tooltips.Distraction Free Settings.Hide Videos, Playlists and Channels Containing Text')"
        @change="handleForbiddenTitles"
        @toggle-show-tags="handleAddedForbiddenTitles"
      />
    </FtFlexBox>
  </FtSettingsSection>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtInputTags from '../FtInputTags/FtInputTags.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'

import store from '../../store/index'

import { showToast } from '../../helpers/utils'
import { checkYoutubeChannelId, findChannelTagInfo } from '../../helpers/channels'

const { t } = useI18n()

const channelHiderDisabled = ref(false)

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => store.getters.getBackendPreference)

/** @type {import('vue').ComputedRef<boolean>} */
const backendFallback = computed(() => store.getters.getBackendFallback)

const backendOptions = computed(() => ({
  preference: backendPreference.value,
  fallback: backendFallback.value
}))

/** @type {import('vue').ComputedRef<boolean>} */
const showAddedChannelsHidden = computed(() => store.getters.getShowAddedChannelsHidden)

function handleAddedChannelsHidden() {
  store.dispatch('updateShowAddedChannelsHidden', !showAddedChannelsHidden.value)
}

/** @type {import('vue').ComputedRef<any[]>} */
const channelsHidden = computed(() => {
  return JSON.parse(store.getters.getChannelsHidden).map((ch) => {
    // Legacy support
    if (typeof ch === 'string') {
      return { name: ch, preferredName: '', icon: '' }
    }
    return ch
  })
})

/**
 * @param {any[]} value
 */
function handleChannelsHidden(value) {
  store.dispatch('updateChannelsHidden', JSON.stringify(value))
}

/** @type {import('vue').ComputedRef<boolean>} */
const showAddedForbiddenTitles = computed(() => store.getters.getShowAddedForbiddenTitles)

function handleAddedForbiddenTitles() {
  store.dispatch('updateShowAddedForbiddenTitles', !showAddedForbiddenTitles.value)
}

/** @type {import('vue').ComputedRef<string[]>} */
const forbiddenTitles = computed(() => JSON.parse(store.getters.getForbiddenTitles))

/**
 * @param {string[]} value
 */
function handleForbiddenTitles(value) {
  store.dispatch('updateForbiddenTitles', JSON.stringify(value))
}

onMounted(() => {
  verifyChannelsHidden()
})

function handleInvalidChannel() {
  showToast(t('Settings.Distraction Free Settings.Hide Channels Invalid'))
}

function handleChannelAPIError() {
  showToast(t('Settings.Distraction Free Settings.Hide Channels API Error'))
}

function handleChannelsExists() {
  showToast(t('Settings.Distraction Free Settings.Hide Channels Already Exists'))
}

/**
 * @param {string} text
 */
async function findChannelTagInfoWrapper(text) {
  return await findChannelTagInfo(text, backendOptions.value)
}

async function verifyChannelsHidden() {
  const channelsHiddenCpy = [...channelsHidden.value]

  for (let i = 0; i < channelsHiddenCpy.length; i++) {
    const tag = channelsHiddenCpy[i]

    // if channel has been processed and confirmed as non existent, skip
    if (tag.invalid) continue

    // process if no preferred name and is possibly a YouTube ID
    if ((tag.preferredName === '' || !tag.icon) && checkYoutubeChannelId(tag.name)) {
      channelHiderDisabled.value = true

      const { preferredName, icon, iconHref, invalidId } = await findChannelTagInfoWrapper(tag.name)
      if (invalidId) {
        channelsHiddenCpy[i] = { name: tag.name, invalid: invalidId }
      } else {
        channelsHiddenCpy[i] = { name: tag.name, preferredName, icon, iconHref }
      }

      // update on every tag in case it closes
      handleChannelsHidden(channelsHiddenCpy)
    }
  }

  channelHiderDisabled.value = false
}
</script>

<style scoped src="./HideContentSettings.css" />
