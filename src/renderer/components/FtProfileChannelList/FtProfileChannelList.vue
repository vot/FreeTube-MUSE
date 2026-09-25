<template>
  <div>
    <FtCard class="card">
      <h2>
        {{ $t("Profile.Subscription List") }}
      </h2>
      <p
        v-if="showUnsubscribeButton"
        class="selectedCount"
      >
        {{ selectedText }}
      </p>
      <FtFlexBox>
        <FtChannelBubble
          v-for="channel in subscriptions"
          :key="channel.id"
          :channel-id="channel.id"
          :channel-name="channel.name"
          :channel-thumbnail="channel.thumbnail"
          :selectable="showUnsubscribeButton"
          :selected="selected.has(channel.id)"
          @change="handleChannelToggle(channel.id)"
        />
      </FtFlexBox>
      <FtFlexBox
        v-if="showUnsubscribeButton"
        class="subscriptionActions"
      >
        <FtFlexBox class="actionsGroup">
          <FtButton
            :label="$t('Profile.Select All')"
            @click="selectAll"
          />
          <FtButton
            :label="$t('Profile.Select None')"
            @click="selectNone"
          />
        </FtFlexBox>
        <FtFlexBox class="actionsGroup">
          <FtButton
            v-if="targetProfiles.length > 0"
            :label="$t('Profile.Copy selected')"
            :disabled="selected.size === 0"
            @click="displayAddToProfilePrompt"
          />
          <FtButton
            :label="$t('Profile.Delete Selected')"
            text-color="var(--destructive-text-color)"
            background-color="var(--destructive-color)"
            :disabled="selected.size === 0"
            @click="displayDeletePrompt"
          />
        </FtFlexBox>
      </FtFlexBox>
    </FtCard>
    <FtPrompt
      v-if="showAddToProfilePrompt"
      :label="addToProfilePromptLabel"
      theme="narrow"
      @click="handleAddToProfilePromptClick"
    >
      <p class="addToProfileDescription">
        {{ addToProfilePromptDescription }}
      </p>
      <div class="addToProfileSelect">
        <FtSelect
          :value="addToProfileTargetProfileId"
          :placeholder="t('Profile.Copy to profile')"
          :select-names="targetProfileNames"
          :select-values="targetProfileIds"
          :icon="['fas', 'copy']"
          @change="handleAddToProfileTargetChange"
        />
      </div>
      <FtFlexBox>
        <FtButton
          :label="t('Profile.Copy')"
          @click="confirmAddToProfile"
        />
        <FtButton
          :label="t('Cancel')"
          @click="handleAddToProfilePromptClick"
        />
      </FtFlexBox>
    </FtPrompt>
    <FtPrompt
      v-if="showDeletePrompt"
      :label="t('Profile.Delete Selected')"
      theme="narrow"
      @click="handleDeletePromptClick"
    >
      <p class="deletePromptDescription">
        {{ deletePromptMessage }}
      </p>
      <FtFlexBox>
        <FtButton
          :label="t('Yes, Delete')"
          text-color="var(--destructive-text-color)"
          background-color="var(--destructive-color)"
          :icon="['fas', 'trash']"
          @click="handleDeletePromptClick('delete')"
        />
        <FtButton
          :label="t('Cancel')"
          @click="handleDeletePromptClick('cancel')"
        />
      </FtFlexBox>
    </FtPrompt>
  </div>
</template>

<script setup>
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import FtCard from '../ft-card/ft-card.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtChannelBubble from '../FtChannelBubble/FtChannelBubble.vue'
import FtButton from '../FtButton/FtButton.vue'
import FtPrompt from '../FtPrompt/FtPrompt.vue'
import FtSelect from '../FtSelect/FtSelect.vue'

import store from '../../store/index'

import { deepCopy, showToast } from '../../helpers/utils'
import { youtubeImageUrlToInvidious } from '../../helpers/api/invidious'
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

const props = defineProps({
  /** @type {import('vue').PropType<Profile>} */
  profile: {
    type: Object,
    required: true
  },
  isMainProfile: {
    type: Boolean,
    required: true
  }
})

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => {
  return store.getters.getBackendPreference
})

/** @type {import('vue').ComputedRef<string>} */
const currentInvidiousInstanceUrl = computed(() => {
  return store.getters.getCurrentInvidiousInstanceUrl
})

const intlCollator = computed(() => {
  return new Intl.Collator([locale.value, 'en'], { sensitivity: 'base' })
})

/** @type {import('vue').ComputedRef<boolean>} */
const showUnsubscribeButton = computed(() => {
  return !store.getters.getHideUnsubscribeButton
})

/** @type {import('vue').ShallowRef<Profile['subscriptions']>} */
const subscriptions = shallowRef([])

function loadSubscriptions() {
  const subscriptions_ = deepCopy(props.profile.subscriptions)

  const collator = intlCollator.value

  subscriptions_.sort((a, b) => collator.compare(a.name, b.name))

  if (backendPreference.value === 'invidious') {
    const instanceUrl = currentInvidiousInstanceUrl.value

    subscriptions_.forEach((channel) => {
      channel.thumbnail = youtubeImageUrlToInvidious(channel.thumbnail, instanceUrl)
    })
  }

  subscriptions.value = subscriptions_
}

if (typeof props.profile.subscriptions !== 'undefined') {
  loadSubscriptions()
}

watch(() => props.profile, () => {
  loadSubscriptions()
  selectNone()
}, { deep: true })

/** @type {import('vue').Reactive<Set<string>>} */
const selected = reactive(new Set())

const selectedText = computed(() => {
  return t('Profile.{number} selected', { number: selected.size })
})

function selectAll() {
  subscriptions.value.forEach(channel => {
    return selected.add(channel.id)
  })
}

function selectNone() {
  selected.clear()
}

/**
 * @param {string} channelId
 */
function handleChannelToggle(channelId) {
  if (selected.has(channelId)) {
    selected.delete(channelId)
  } else {
    selected.add(channelId)
  }
}

/** @type {import('vue').ComputedRef<Profile[]>} */
const profileList = computed(() => {
  return store.getters.getProfileList
})

/** @type {import('vue').ComputedRef<Profile[]>} */
const targetProfiles = computed(() => {
  return profileList.value.filter((profile) => profile._id !== props.profile._id)
})

/** @type {import('vue').ComputedRef<string[]>} */
const targetProfileIds = computed(() => {
  return targetProfiles.value.map((profile) => profile._id)
})

/** @type {import('vue').ComputedRef<string[]>} */
const targetProfileNames = computed(() => {
  return targetProfiles.value.map(translateProfileName)
})

/**
 * @param {Profile} profile
 */
function translateProfileName(profile) {
  return profile._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : profile.name
}

const showAddToProfilePrompt = ref(false)

const addToProfilePromptLabel = computed(() => {
  return t('Profile.Copy selected')
})

const addToProfilePromptDescription = computed(() => {
  if (selected.size === 1) {
    return t('Profile.Choose the profile to copy the selected channel to')
  }

  return t('Profile.Choose the profile to copy the {number} selected channels to', {
    number: selected.size
  })
})

/** @type {import('vue').Ref<string>} */
const addToProfileTargetProfileId = ref('')

function displayAddToProfilePrompt() {
  if (selected.size === 0) {
    showToast(t('Profile.No channel(s) have been selected'))
    return
  }

  addToProfileTargetProfileId.value = targetProfiles.value[0]?._id ?? ''
  showAddToProfilePrompt.value = true
}

/**
 * @param {string} value
 */
function handleAddToProfileTargetChange(value) {
  addToProfileTargetProfileId.value = value
}

function handleAddToProfilePromptClick() {
  showAddToProfilePrompt.value = false
}

function confirmAddToProfile() {
  if (addToProfileTargetProfileId.value !== '') {
    addSelectedChannelsToProfile(addToProfileTargetProfileId.value)
  }

  showAddToProfilePrompt.value = false
}

/**
 * @param {string} targetProfileId
 */
function addSelectedChannelsToProfile(targetProfileId) {
  const targetProfile = targetProfiles.value.find((profile) => profile._id === targetProfileId)

  if (targetProfile === undefined) {
    return
  }

  const targetSubscriptions = deepCopy(targetProfile.subscriptions)
  const existingIds = new Set(targetSubscriptions.map((channel) => channel.id))

  props.profile.subscriptions.forEach((channel) => {
    if (selected.has(channel.id) && !existingIds.has(channel.id)) {
      targetSubscriptions.push(deepCopy(channel))
    }
  })

  store.dispatch('updateProfile', {
    ...targetProfile,
    subscriptions: targetSubscriptions
  })

  showToast(t('Profile.Profile has been updated'))
  selectNone()
}

const showDeletePrompt = ref(false)

const deletePromptMessage = computed(() => {
  if (props.isMainProfile) {
    return t('Profile["This is your primary profile.  Are you sure you want to delete the selected channels?  The same channels will be deleted in any profile they are found in."]')
  } else {
    return t('Profile["Are you sure you want to delete the selected channels?  This will not delete the channel from any other profile."]')
  }
})

function displayDeletePrompt() {
  if (selected.size === 0) {
    showToast(t('Profile.No channel(s) have been selected'))
  } else {
    showDeletePrompt.value = true
  }
}

/**
 * @param {'delete' | 'cancel' | null} value
 */
function handleDeletePromptClick(value) {
  if (value === 'delete') {
    subscriptions.value = subscriptions.value.filter((channel) => {
      return !selected.has(channel.id)
    })

    if (props.isMainProfile) {
      profileList.value.forEach((x) => {
        const profile = deepCopy(x)

        profile.subscriptions = profile.subscriptions.filter((channel) => {
          return !selected.has(channel.id)
        })

        // Only update changed profiles
        if (x.subscriptions.length !== profile.subscriptions.length) {
          store.dispatch('updateProfile', profile)
        }
      })

      showToast(t('Profile.Profile has been updated'))
      selectNone()
    } else {
      /** @type {Profile} */
      const profile = {
        ...props.profile,
        subscriptions: deepCopy(subscriptions.value)
      }

      store.dispatch('updateProfile', profile)

      showToast(t('Profile.Profile has been updated'))
      selectNone()
    }
  }

  showDeletePrompt.value = false
}
</script>

<style scoped src="./FtProfileChannelList.css" />
