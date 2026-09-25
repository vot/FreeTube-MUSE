<template>
  <div>
    <div
      class="colorOption"
      :title="$t('Profile.Go To Profile Manager')"
      :style="{ background: activeProfile.bgColor, color: activeProfile.textColor }"
      tabindex="0"
      role="button"
      @click="openProfileSettings"
      @keydown.enter.space.prevent="openProfileSettings"
    >
      <div
        class="initial"
        dir="auto"
      >
        {{ activeProfileInitial }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import store from '../../store/index'

import { MAIN_PROFILE_ID } from '../../../constants'
import { getFirstCharacter } from '../../helpers/strings'

/**
 * @typedef {object} Profile
 * @property {string} _id
 * @property {string} name
 * @property {string} bgColor
 * @property {string} textColor
 * @property {object[]} subscriptions
 * @property {string} subscriptions[].id
 * @property {string|undefined} subscriptions[].name
 * @property {string|undefined} subscriptions[].thumbnail
 */

const { locale, t } = useI18n()

/** @type {import('vue').ComputedRef<Profile>} */
const activeProfile = computed(() => store.getters.getActiveProfile)

const activeProfileInitial = computed(() => {
  return activeProfile.value?.name
    ? getFirstCharacter(translateProfileName(activeProfile.value), locale.value)
    : ''
})

const router = useRouter()

function openProfileSettings() {
  router.push({ path: '/settings/profile' })
}

/**
 * @param {Profile} profile
 */
function translateProfileName(profile) {
  return profile._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : profile.name
}
</script>

<style scoped src="./FtProfileSelector.css" />
