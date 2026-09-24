<template>
  <button
    v-if="feedRefreshState.refreshAction"
    class="refreshNavButton"
    :aria-label="refreshFeedButtonTitle"
    :disabled="feedRefreshState.disableRefresh"
    :title="refreshFeedButtonTitle"
    @click="refresh"
  >
    <FontAwesomeIcon
      class="refreshIcon"
      :icon="['fas', 'sync']"
    />
    <span
      v-if="feedRefreshState.lastRefreshTimestamp"
      class="refreshTimestamp"
    >
      {{ feedRefreshState.lastRefreshTimestamp }}
    </span>
  </button>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { feedRefreshState } from '../../composables/useFeedRefresh'

import { KeyboardShortcuts } from '../../../constants'
import { addKeyboardShortcutToActionTitle } from '../../helpers/utils'

const { t } = useI18n()

const refreshFeedButtonTitle = computed(() => {
  return addKeyboardShortcutToActionTitle(
    t('Feed.Refresh Feed', { subscriptionName: feedRefreshState.title }),
    KeyboardShortcuts.APP.SITUATIONAL.REFRESH
  )
})

function refresh() {
  feedRefreshState.refreshAction?.()
}
</script>

<style scoped lang="scss" src="./FtRefreshWidget.scss" />
