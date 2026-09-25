<template>
  <div>
    <div class="main-content-container">
      <h2>{{ $t("Profile.Profile Manager") }}</h2>
      <div class="pageColumns">
        <div class="profileListColumn">
          <div
            class="profileList"
            role="listbox"
            :aria-label="$t('Profile.Profile Manager')"
          >
            <div
              v-for="profile in profileList"
              :key="profile._id"
              class="profileRow"
              :class="{
                indented: !isMainProfile(profile),
                selected: profile._id === selectedProfileId,
                active: isActiveProfile(profile)
              }"
              :aria-selected="profile._id === selectedProfileId"
              role="option"
              tabindex="0"
              @click="selectProfile(profile._id)"
              @keydown.enter.space.prevent="selectProfile(profile._id)"
            >
              <div
                class="bubble"
                :style="{ background: profile.bgColor, color: profile.textColor }"
              >
                <span
                  class="initial"
                  dir="auto"
                >
                  {{ profileInitial(profile) }}
                </span>
              </div>
              <div class="profileInfo">
                <p
                  class="profileName"
                  dir="auto"
                >
                  {{ translatedProfileName(profile) }}
                </p>
                <div class="badgesRow">
                  <span
                    v-if="isActiveProfile(profile)"
                    class="activeBadge"
                  >
                    {{ $t("Profile.Active Profile") }}
                  </span>
                  <span
                    v-if="isDefaultProfile(profile)"
                    class="defaultBadge"
                  >
                    {{ $t("Profile.Default Profile") }}
                  </span>
                </div>
              </div>
              <span
                class="actionButtons"
                @click.stop
              >
                <FtIconButton
                  class="makeActiveButton"
                  :icon="['fas', 'check']"
                  :title="isActiveProfile(profile)
                    ? $t('Profile.Active Profile')
                    : $t('Profile.Make Active')"
                  :disabled="isActiveProfile(profile)"
                  @click="setActiveProfile(profile)"
                />
                <FtIconButton
                  class="editButton"
                  :icon="['fas', 'edit']"
                  :title="$t('Profile.Edit Profile')"
                  @click="openEditProfile(profile)"
                />
              </span>
            </div>
          </div>
          <FtFlexBox class="createButton">
            <FtButton
              :label="$t('Profile.Create New Profile')"
              @click="openNewProfile"
            />
          </FtFlexBox>
        </div>
        <div class="subscriptionsColumn">
          <FtProfileChannelList
            v-if="selectedProfile"
            :profile="selectedProfile"
            :is-main-profile="isSelectedProfileMain"
          />
        </div>
      </div>
    </div>

    <FtPrompt
      v-if="editModalProfile"
      :label="editModalTitle"
      theme="half"
      @click="closeEditModal"
    >
      <FtProfileEdit
        :key="editModalKey"
        class="editProfileCard"
        :profile="editModalProfile"
        :is-new="isNewProfileOpen"
        :is-main-profile="isEditModalProfileMain"
        @new-profile-created="handleNewProfileCreated"
        @profile-deleted="handleProfileDeleted"
        @cancel="closeEditModal"
      />
    </FtPrompt>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import FtProfileEdit from '../../components/FtProfileEdit/FtProfileEdit.vue'
import FtProfileChannelList from '../../components/FtProfileChannelList/FtProfileChannelList.vue'
import FtFlexBox from '../../components/ft-flex-box/ft-flex-box.vue'
import FtButton from '../../components/FtButton/FtButton.vue'
import FtIconButton from '../../components/FtIconButton/FtIconButton.vue'
import FtPrompt from '../../components/FtPrompt/FtPrompt.vue'

import store from '../../store/index'

import { showToast } from '../../helpers/utils'
import { calculateColorLuminance, getRandomColor } from '../../helpers/colors'
import { getFirstCharacter } from '../../helpers/strings'
import { MAIN_PROFILE_ID } from '../../../constants'

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

/** @type {import('vue').ComputedRef<Profile[]>} */
const profileList = computed(() => {
  return store.getters.getProfileList
})

/** @type {import('vue').ComputedRef<Profile>} */
const activeProfile = computed(() => {
  return store.getters.getActiveProfile
})

/** @type {import('vue').Ref<string>} */
const selectedProfileId = ref(MAIN_PROFILE_ID)

/** @type {import('vue').ComputedRef<Profile|null>} */
const selectedProfile = computed(() => {
  return profileList.value.find((profile) => profile._id === selectedProfileId.value) ?? null
})

const isSelectedProfileMain = computed(() => {
  return selectedProfileId.value === MAIN_PROFILE_ID
})

/** @type {import('vue').Ref<Profile|null>} */
const editModalProfile = ref(null)

const isNewProfileOpen = ref(false)

const isEditModalProfileMain = computed(() => {
  return editModalProfile.value?._id === MAIN_PROFILE_ID
})

const editModalKey = computed(() => {
  return editModalProfile.value?._id ?? 'new'
})

const editModalTitle = computed(() => {
  return isNewProfileOpen.value ? t('Profile.Create Profile') : t('Profile.Edit Profile')
})

/**
 * @param {string} profileId
 */
function selectProfile(profileId) {
  if (selectedProfileId.value === profileId) {
    return
  }

  selectedProfileId.value = profileId
}

/**
 * @param {Profile} profile
 */
function openEditProfile(profile) {
  isNewProfileOpen.value = false
  editModalProfile.value = profile
}

function openNewProfile() {
  isNewProfileOpen.value = true

  editModalProfile.value = {
    name: '',
    bgColor: getRandomColor().value,
    textColor: calculateColorLuminance(getRandomColor().value),
    subscriptions: []
  }
}

function closeEditModal() {
  isNewProfileOpen.value = false
  editModalProfile.value = null
}

function handleNewProfileCreated() {
  closeEditModal()
}

function handleProfileDeleted() {
  const deletedProfileId = editModalProfile.value?._id

  closeEditModal()

  if (deletedProfileId === selectedProfileId.value) {
    selectedProfileId.value = MAIN_PROFILE_ID
  }
}

/**
 * @param {Profile} profile
 */
function setActiveProfile(profile) {
  if (profile._id === activeProfile.value?._id) {
    return
  }

  store.commit('setActiveProfile', profile._id)

  showToast(t('Profile.{profile} is now the active profile', {
    profile: translatedProfileName(profile)
  }))
}

/**
 * @param {Profile} profile
 */
function isMainProfile(profile) {
  return profile._id === MAIN_PROFILE_ID
}

/**
 * @param {Profile} profile
 */
function isActiveProfile(profile) {
  return profile._id === activeProfile.value?._id
}

/**
 * @param {Profile} profile
 */
function isDefaultProfile(profile) {
  return profile._id === store.state.settings.defaultProfile
}

/**
 * @param {Profile} profile
 */
function profileInitial(profile) {
  const name = translatedProfileName(profile)

  return name ? getFirstCharacter(name, locale.value) : ''
}

/**
 * @param {Profile} profile
 */
function translatedProfileName(profile) {
  return isMainProfile(profile) ? t('Profile.All Channels') : profile.name
}
</script>

<style scoped src="./ProfileSettings.css" />
