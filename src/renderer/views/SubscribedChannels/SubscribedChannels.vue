<template>
  <div>
    <div class="main-content-container">
      <ft-card>
        <div class="heading">
          <h2>
            <FontAwesomeIcon
              :icon="['fas', 'user-check']"
              class="headingIcon"
            />
            {{ $t('Channels.Title') }}
          </h2>
        </div>
        <ft-card
          v-if="subscribedChannels.length > 0"
          class="pageControls"
        >
          <div class="pageControlsText">
            <div>
              {{ $t('Global.Counts.Channel Count', { count: formatNumber(channelList.length) }, channelList.length) }}
            </div>
          </div>
          <div class="pageControlsInputs">
            <ft-input
              v-show="subscribedChannels.length > 1"
              ref="searchBarChannels"
              :placeholder="$t('Channels.Search bar placeholder')"
              :value="query"
              :show-clear-text-button="true"
              :show-action-button="false"
              :maxlength="255"
              @input="handleQueryChange"
              @clear="() => handleQueryChange('')"
            />
          </div>
          <div class="sortingBy">
            <button
              v-if="subscribedChannels.length > 1"
              type="button"
              class="textButton"
              @click="isSortByPromptShown = true"
            >
              {{ $t('Global.Sorting By') }} {{ sortByName }}
            </button>
          </div>
        </ft-card>
        <ft-flex-box
          v-if="activeSubscriptionList.length === 0"
        >
          <p class="message">
            {{ $t('Channels.Empty') }}
          </p>
        </ft-flex-box>
        <template v-else>
          <ft-flex-box class="channels">
            <div
              v-for="channel in channelList"
              :key="channel.id"
              class="channel"
            >
              <component
                :is="enableChannelLinks ? 'router-link' : 'span'"
                tabindex="-1"
                class="thumbnailContainer"
                :to="`/channel/${channel.id}`"
              >
                <img
                  v-if="channel.thumbnail != null"
                  class="channelThumbnail"
                  :src="thumbnailURL(channel.thumbnail)"
                  alt=""
                  @error.once="updateThumbnail(channel)"
                >
                <font-awesome-icon
                  v-else
                  class="channelThumbnail"
                  :icon="['fas', 'circle-user']"
                />
              </component>
              <component
                :is="enableChannelLinks ? 'router-link' : 'span'"
                class="channelName"
                dir="auto"
                :title="channel.name"
                :to="`/channel/${channel.id}`"
              >
                {{ channel.name }}
              </component>
              <div
                v-if="!hideUnsubscribeButton"
                class="unsubscribeContainer"
              >
                <ft-subscribe-button
                  :channel-id="channel.id"
                  :channel-name="channel.name"
                  :channel-thumbnail="channel.thumbnail"
                  :open-dropdown-on-subscribe="false"
                />
              </div>
            </div>
          </ft-flex-box>
        </template>
      </ft-card>
      <FtSortByPrompt
        v-if="isSortByPromptShown"
        :selected-sort-by="sortBy"
        :sort-by-names="sortByNames"
        :sort-by-values="SORT_BY_VALUES"
        @apply="applySortBy"
        @close="isSortByPromptShown = false"
      />
    </div>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, onBeforeUnmount, ref, watch, useTemplateRef } from 'vue'
import { isNavigationFailure, NavigationFailureType, useRoute, useRouter } from 'vue-router'
import FtCard from '../../components/ft-card/ft-card.vue'
import FtFlexBox from '../../components/ft-flex-box/ft-flex-box.vue'
import FtInput from '../../components/FtInput/FtInput.vue'
import FtSubscribeButton from '../../components/FtSubscribeButton/FtSubscribeButton.vue'
import FtSortByPrompt from '../../components/FtSortByPrompt/FtSortByPrompt.vue'
import { invidiousGetChannelInfo, youtubeImageUrlToInvidious, invidiousImageUrlToInvidious } from '../../helpers/api/invidious'
import { getLocalChannel, parseLocalChannelHeader } from '../../helpers/api/local'
import { ctrlFHandler, debounce, formatNumber } from '../../helpers/utils'
import { useI18n } from 'vue-i18n'
import store from '../../store/index'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()

const re = {
  url: /(.+=\w)\d+(.+)/,
  ivToYt: /^.+ggpht\/(.+)/
}
const ytBaseURL = 'https://yt3.ggpht.com'
const thumbnailSize = 176
let errorCount = 0

const SORT_BY_OPTIONS = {
  NameAscending: 'name_ascending',
  NameDescending: 'name_descending',

  LatestSubscribedFirst: 'latest_subscribed_first',
  EarliestSubscribedFirst: 'earliest_subscribed_first',
}

const SORT_BY_VALUES = Object.values(SORT_BY_OPTIONS)

const query = ref('')
const subscribedChannels = ref([])
const filteredChannels = ref([])

const isSortByPromptShown = ref(false)

const searchBarChannels = useTemplateRef('searchBarChannels')

/** @type {import('vue').ComputedRef<object>} */
const activeProfile = computed(() => {
  return store.getters.getActiveProfile
})

/** @type {import('vue').ComputedRef<string>} */
const activeProfileId = computed(() => {
  return activeProfile.value._id
})

/** @type {import('vue').ComputedRef<Array>} */
const activeSubscriptionList = computed(() => {
  return activeProfile.value.subscriptions
})

/** @type {import('vue').ComputedRef<Array>} */
const channelList = computed(() => {
  if (query.value !== '') {
    return filteredChannels.value
  } else {
    return subscribedChannels.value
  }
})

/** @type {import('vue').ComputedRef<boolean>} */
const hideUnsubscribeButton = computed(() => {
  return store.getters.getHideUnsubscribeButton
})

/** @type {import('vue').ComputedRef<string>} */
const sortBy = computed(() => store.getters.getUserChannelsSortBy)

/** @type {import('vue').ComputedRef<Array<string>>} */
const sortByNames = computed(() => SORT_BY_VALUES.map((value) => {
  switch (value) {
    case SORT_BY_OPTIONS.NameAscending: return t('Channels.Sort By.NameAscending')
    case SORT_BY_OPTIONS.NameDescending: return t('Channels.Sort By.NameDescending')
    case SORT_BY_OPTIONS.LatestSubscribedFirst: return t('Channels.Sort By.LatestSubscribedFirst')
    case SORT_BY_OPTIONS.EarliestSubscribedFirst: return t('Channels.Sort By.EarliestSubscribedFirst')
    default:
      console.error(`Unknown sortBy: ${value}`)
      return value
  }
}))

/** @type {import('vue').ComputedRef<string>} */
const sortByName = computed(() => {
  return sortByNames.value[SORT_BY_VALUES.indexOf(sortBy.value)]
})

const cachedCollator = computed(() => {
  return new Intl.Collator([locale.value, 'en'], { sensitivity: 'base' })
})

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => {
  return store.getters.getBackendPreference
})

/** @type {import('vue').ComputedRef<string>} */
const currentInvidiousInstanceUrl = computed(() => {
  return store.getters.getCurrentInvidiousInstanceUrl
})

function getSubscription() {
  const channels = activeSubscriptionList.value.slice()

  switch (sortBy.value) {
    case SORT_BY_OPTIONS.NameAscending:
      channels.sort((a, b) => cachedCollator.value.compare(a.name ?? '', b.name ?? ''))
      break
    case SORT_BY_OPTIONS.NameDescending:
      channels.sort((a, b) => cachedCollator.value.compare(b.name ?? '', a.name ?? ''))
      break
    case SORT_BY_OPTIONS.LatestSubscribedFirst:
      // Subscriptions are stored in the order they were added
      channels.reverse()
      break
    case SORT_BY_OPTIONS.EarliestSubscribedFirst:
    default:
      // Subscriptions are stored in the order they were added
      break
  }

  subscribedChannels.value = channels
}

function applySortBy(value) {
  store.dispatch('updateUserChannelsSortBy', value)
  isSortByPromptShown.value = false
}

function filterChannels() {
  if (query.value === '') {
    filteredChannels.value = []
    return
  }

  const escapedQuery = query.value.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&')
  const re = new RegExp(escapedQuery, 'i')
  filteredChannels.value = subscribedChannels.value.filter(channel => {
    return re.test(channel.name)
  })
}

const filterChannelsDebounce = debounce(filterChannels, 500)

function thumbnailURL(originalURL) {
  if (originalURL == null) { return null }
  let newURL = originalURL
  // Sometimes relative protocol URLs are passed in
  if (originalURL.startsWith('//')) {
    newURL = `https:${originalURL}`
  }
  const hostname = new URL(newURL).hostname
  if (hostname === 'yt3.ggpht.com' || hostname === 'yt3.googleusercontent.com') {
    if (backendPreference.value === 'invidious') { // YT to IV
      newURL = youtubeImageUrlToInvidious(newURL, currentInvidiousInstanceUrl.value)
    }
  } else {
    if (backendPreference.value === 'local') { // IV to YT
      newURL = newURL.replace(re.ivToYt, `${ytBaseURL}/$1`)
    } else { // IV to IV
      newURL = invidiousImageUrlToInvidious(newURL, currentInvidiousInstanceUrl.value)
    }
  }

  return newURL.replace(re.url, `$1${thumbnailSize}$2`)
}

function updateThumbnail(channel) {
  errorCount += 1
  if (backendPreference.value === 'local') {
    // avoid too many concurrent requests
    setTimeout(() => {
      getLocalChannel(channel.id).then(response => {
        if (!response.alert) {
          store.dispatch('updateSubscriptionDetails', {
            channelThumbnailUrl: thumbnailURL(parseLocalChannelHeader(response).thumbnailUrl),
            channelName: channel.name,
            channelId: channel.id
          })
        }
      })
    }, errorCount * 500)
  } else {
    setTimeout(() => {
      invidiousGetChannelInfo(channel.id).then(response => {
        store.dispatch('updateSubscriptionDetails', {
          channelThumbnailUrl: thumbnailURL(response.authorThumbnails[0].url),
          channelName: channel.name,
          channelId: channel.id
        })
      })
    }, errorCount * 500)
  }
}

function handleQueryChange(val, filterNow = false) {
  query.value = val

  saveStateInRouter(val)

  filterNow ? filterChannels() : filterChannelsDebounce()
}

async function saveStateInRouter(query) {
  if (query.value === '') {
    await router.replace({ name: 'subscribedChannels' }).catch(failure => {
      if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
        return
      }

      throw failure
    })
    return
  }

  await router.replace({
    name: 'subscribedChannels',
    query: { searchQueryText: query },
  }).catch(failure => {
    if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      return
    }

    throw failure
  })
}

function keyboardShortcutHandler(event) {
  ctrlFHandler(event, searchBarChannels.value)
}

watch(activeProfileId, () => {
  query.value = ''
  getSubscription()
})

watch(activeSubscriptionList, () => {
  getSubscription()
  filterChannels()
})

watch(sortBy, () => {
  getSubscription()
  filterChannels()
})

// region created

getSubscription()

const oldQuery = route.query.searchQueryText ?? ''
if (oldQuery !== null && oldQuery !== '') {
  // `handleQueryChange` must be called after `filterHistoryDebounce` assigned
  handleQueryChange(oldQuery, true)
}

// endregion created

onMounted(() => {
  document.addEventListener('keydown', keyboardShortcutHandler)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', keyboardShortcutHandler)
})

const enableChannelLinks = computed(() => !store.getters.getDisableChannelLinks)

</script>
<style scoped src="./SubscribedChannels.css" />
