<template>
  <div>
    <div class="main-content-container">
      <FtLoader
        v-if="isLoading"
        :fullscreen="true"
      />
      <FtCard
        v-else
      >
        <div class="heading">
          <h2>
            <FontAwesomeIcon
              :icon="['fas', 'search']"
              class="headingIcon"
            />
            {{ t("Search Filters.Search Results") }}
          </h2>
        </div>
        <FtCard class="pageControls">
          <div class="pageControlsText">
            <div>
              <strong>
                <bdi>{{ t('Search Filters.Found Results For', { searchTerm: processedQuery, count: resultCount }, shownResults.length) }}</bdi>
              </strong>
            </div>
            <div class="resultLinks">
              <button
                type="button"
                class="textButton"
                @click="showSearchFilters"
              >
                {{ filterLinkLabel }}
              </button>
              <button
                v-if="activeFilterCount > 0"
                type="button"
                class="textButton"
                @click="clearSearchFilters"
              >
                {{ t('Search Filters.Clear Filters') }}
              </button>
            </div>
          </div>
          <div class="sortingBy">
            {{ t('Global.Sorting By') }}
            <button
              type="button"
              class="textButton"
              @click="isSortByPromptShown = true"
            >
              {{ sortByName }}
            </button>
          </div>
        </FtCard>
        <FtElementList
          :data="shownResults"
        />
        <FtAutoLoadNextPageWrapper
          v-if="!isNextPageLoading"
          @load-next-page="nextPage"
        >
          <div
            class="getNextPage"
            role="button"
            tabindex="0"
            @click="nextPage"
            @keydown.enter.space.prevent="nextPage"
          >
            <FontAwesomeIcon :icon="['fas', 'search']" /> {{ t("Search Filters.Fetch more results") }}
          </div>
        </FtAutoLoadNextPageWrapper>
      </FtCard>
    </div>
    <FtSortByPrompt
      v-if="isSortByPromptShown"
      :selected-sort-by="sortBy"
      :sort-by-names="sortByNames"
      :sort-by-values="SORT_BY_VALUES"
      @apply="applySortBy"
      @close="isSortByPromptShown = false"
    />
    <FtSearchFilters
      v-if="isSearchFiltersShown"
      :search-settings="appliedSearchSettings"
      @apply="applySearchFilters"
      @close="hideSearchFilters"
    />
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import FtLoader from '../../components/FtLoader/FtLoader.vue'
import FtCard from '../../components/ft-card/ft-card.vue'
import FtElementList from '../../components/FtElementList/FtElementList.vue'
import FtSearchFilters from '../../components/FtSearchFilters/FtSearchFilters.vue'
import FtSortByPrompt from '../../components/FtSortByPrompt/FtSortByPrompt.vue'
import FtAutoLoadNextPageWrapper from '../../components/FtAutoLoadNextPageWrapper.vue'

import store from '../../store'

import {
  copyToClipboard,
  searchSettingsFromQuery,
  searchSettingsToQuery,
  searchFiltersMatch,
  DEFAULT_SEARCH_SETTINGS,
  formatResultCount,
  showToast,
} from '../../helpers/utils'
import {
  extractLocalCacheableSearchContinuation,
  getLocalSearchContinuation,
  getLocalSearchResults
} from '../../helpers/api/local'
import { getInvidiousSearchResults } from '../../helpers/api/invidious'
import { SEARCH_CHAR_LIMIT } from '../../../constants'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const isNextPageLoading = ref(false)
const isSearchFiltersShown = ref(false)
const apiUsed = ref('local')
const searchSettings = ref({})
const searchPage = ref(1)
/** @type {import('vue').ShallowRef<import('youtubei.js').YT.Search | string | null>} */
const nextPageRef = shallowRef(null)
const shownResults = shallowRef([])

const query = ref('')
const processedQuery = computed(() => query.value.trim())

/*
  The total amount of results is not known upfront,
  so a "+" is shown when more results can still be fetched.
  The local API tells us with its continuation, while the
  Invidious API has no such indicator.
*/
/** @type {import('vue').ComputedRef<boolean>} */
const hasMoreResults = computed(() => {
  if (apiUsed.value === 'invidious') {
    return shownResults.value.length > 0
  }

  return nextPageRef.value !== null
})

/** @type {import('vue').ComputedRef<string>} */
const resultCount = computed(() => {
  return formatResultCount(shownResults.value.length, hasMoreResults.value)
})

/** @type {import('vue').ComputedRef<any[]>} */
const sessionSearchHistory = computed(() => store.getters.getSessionSearchHistory)

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => store.getters.getBackendPreference)

/** @type {import('vue').ComputedRef<boolean>} */
const backendFallback = computed(() => store.getters.getBackendFallback)

/** @type {import('vue').ComputedRef<boolean>} */
const showFamilyFriendlyOnly = computed(() => store.getters.getShowFamilyFriendlyOnly)

/** @type {import('vue').ComputedRef<boolean>} */
const rememberSearchHistory = computed(() => store.getters.getRememberSearchHistory)

// Re-runs the search when the query or the applied filters change
watch(() => route.fullPath, () => {
  const query_ = route.params.query.trim()

  const payload = {
    query: query_,
    options: {},
    searchSettings: searchSettingsFromQuery(route.query)
  }

  query.value = query_

  store.commit('setAppTitle', processedQuery.value)
  checkSearchCache(payload)
})

onMounted(() => {
  query.value = route.params.query
  store.commit('setAppTitle', processedQuery.value)

  const payload = {
    query: processedQuery.value,
    options: {},
    searchSettings: searchSettingsFromQuery(route.query)
  }

  checkSearchCache(payload)
})

/**
 * Filters only ever live in the url, so that they are part of the search
 * and a new search always starts without them
 * @type {import('vue').ComputedRef<import('../../helpers/utils').SearchSettings>}
 */
const appliedSearchSettings = computed(() => searchSettingsFromQuery(route.query))

const hasActiveFilters = computed(() => !searchFiltersMatch(appliedSearchSettings.value, DEFAULT_SEARCH_SETTINGS))

const SORT_BY_VALUES = ['relevance', 'popularity']

const sortByNames = computed(() => [
  t('Search Filters.Prioritize.Most Relevant'),
  t('Search Filters.Prioritize.Popularity')
])

/** @type {import('vue').ComputedRef<'relevance' | 'popularity'>} */
const sortBy = computed(() => appliedSearchSettings.value.prioritize)

/** @type {import('vue').ComputedRef<string>} */
const sortByName = computed(() => sortByNames.value[SORT_BY_VALUES.indexOf(sortBy.value)])

const isSortByPromptShown = ref(false)

/** @type {import('vue').ComputedRef<number>} */
const activeFilterCount = computed(() => {
  const settings = appliedSearchSettings.value

  return [
    settings.time !== DEFAULT_SEARCH_SETTINGS.time,
    settings.type !== DEFAULT_SEARCH_SETTINGS.type,
    settings.duration !== DEFAULT_SEARCH_SETTINGS.duration,
    settings.features.length > 0
  ].filter(Boolean).length
})

/** @type {import('vue').ComputedRef<string>} */
const filterLinkLabel = computed(() => {
  return activeFilterCount.value > 0
    ? t('Search Filters.Filters Applied', { count: activeFilterCount.value })
    : t('Search Filters.Refine Results')
})

function showSearchFilters() {
  isSearchFiltersShown.value = true
}

function hideSearchFilters() {
  isSearchFiltersShown.value = false
}

/**
 * @param {import('../../helpers/utils').SearchSettings} newSearchSettings
 */
function applySearchFilters(newSearchSettings) {
  hideSearchFilters()

  if (searchFiltersMatch(appliedSearchSettings.value, newSearchSettings)) {
    return
  }

  router.push({
    path: route.path,
    query: searchSettingsToQuery(newSearchSettings)
  })
}

function applySortBy(value) {
  isSortByPromptShown.value = false

  if (value === sortBy.value) {
    return
  }

  router.push({
    path: route.path,
    query: searchSettingsToQuery({ ...appliedSearchSettings.value, prioritize: value })
  })
}

function clearSearchFilters() {
  if (!hasActiveFilters.value) {
    return
  }

  // The sort preference is not a filter, so it is kept
  router.push({
    path: route.path,
    query: searchSettingsToQuery({ ...DEFAULT_SEARCH_SETTINGS, prioritize: sortBy.value })
  })
}

function updateSearchHistoryEntry() {
  const persistentSearchHistoryPayload = {
    _id: processedQuery.value,
    lastUpdatedAt: Date.now()
  }

  store.dispatch('updateSearchHistoryEntry', persistentSearchHistoryPayload)
}

function checkSearchCache(payload) {
  if (payload.query.length > SEARCH_CHAR_LIMIT) {
    console.warn(`Search character limit is: ${SEARCH_CHAR_LIMIT}`)
    showToast(t('Search character limit', { searchCharacterLimit: SEARCH_CHAR_LIMIT }))
    return
  }

  const sameSearch = sessionSearchHistory.value.filter((search) => {
    return search.query === payload.query && searchFiltersMatch(payload.searchSettings, search.searchSettings)
  })

  if (sameSearch.length > 0) {
    // No loading effect needed here, only rendered result update
    replaceShownResults(sameSearch[0])
  } else {
    // Show loading effect coz there will be network request(s)
    isLoading.value = true
    searchSettings.value = payload.searchSettings

    switch (backendPreference.value) {
      case 'local':
        performSearchLocal(payload)
        break
      case 'invidious':
        performSearchInvidious(payload, { resetSearchPage: true })
        break
    }
  }

  if (rememberSearchHistory.value) {
    updateSearchHistoryEntry()
  }
}

async function performSearchLocal(payload) {
  isLoading.value = true

  try {
    const { results, continuationData } = await getLocalSearchResults(
      payload.query,
      payload.searchSettings,
      showFamilyFriendlyOnly.value
    )

    apiUsed.value = 'local'

    shownResults.value = results
    nextPageRef.value = continuationData

    isLoading.value = false

    const historyPayload = {
      query: payload.query,
      data: shownResults.value,
      searchSettings: searchSettings.value,
      nextPageRef: nextPageRef.value ? extractLocalCacheableSearchContinuation(nextPageRef.value) : null,
      apiUsed: apiUsed.value
    }

    store.commit('addToSessionSearchHistory', historyPayload)

    updateSubscriptionDetails(results)
  } catch (err) {
    console.error(err)

    const errorMessage = t('Local API Error (Click to copy)')
    showToast(`${errorMessage}: ${err}`, 10000, () => {
      copyToClipboard(err)
    })

    if (backendPreference.value === 'local' && backendFallback.value) {
      showToast(t('Falling back to Invidious API'))
      await performSearchInvidious(payload)
    } else {
      isLoading.value = false
    }
  }
}

async function getNextpageLocal(payload) {
  try {
    const { results, continuationData } = await getLocalSearchContinuation(payload.options.nextPageRef)

    if (results.length === 0) {
      return
    }

    apiUsed.value = 'local'

    shownResults.value = shownResults.value.concat(results)
    nextPageRef.value = continuationData

    const historyPayload = {
      query: payload.query,
      data: shownResults.value,
      searchSettings: searchSettings.value,
      nextPageRef: nextPageRef.value ? extractLocalCacheableSearchContinuation(nextPageRef.value) : null,
      apiUsed: apiUsed.value
    }

    store.commit('addToSessionSearchHistory', historyPayload)

    updateSubscriptionDetails(results)
  } catch (err) {
    console.error(err)

    const errorMessage = t('Local API Error (Click to copy)')
    showToast(`${errorMessage}: ${err}`, 10000, () => {
      copyToClipboard(err)
    })

    if (backendPreference.value === 'local' && backendFallback.value) {
      showToast(t('Falling back to Invidious API'))
      await performSearchInvidious(payload)
    } else {
      isLoading.value = false
    }
  }
}

async function performSearchInvidious(payload, options = { resetSearchPage: false }) {
  if (options.resetSearchPage) {
    searchPage.value = 1
  }

  if (searchPage.value === 1) {
    isLoading.value = true
  }

  try {
    const results = await getInvidiousSearchResults(payload.query, searchPage.value, payload.searchSettings)
    if (!results) {
      return
    }

    apiUsed.value = 'invidious'

    if (searchPage.value !== 1) {
      shownResults.value = shownResults.value.concat(results)
    } else {
      shownResults.value = results
    }

    isLoading.value = false

    searchPage.value++

    const historyPayload = {
      query: payload.query,
      data: shownResults.value,
      searchSettings: searchSettings.value,
      searchPage: searchPage.value,
      apiUsed: apiUsed.value
    }

    store.commit('addToSessionSearchHistory', historyPayload)

    updateSubscriptionDetails(results)
  } catch (err) {
    console.error(err)

    const errorMessage = t('Invidious API Error (Click to copy)')
    showToast(`${errorMessage}: ${err}`, 10000, () => {
      copyToClipboard(err)
    })

    if (process.env.SUPPORTS_LOCAL_API && backendPreference.value === 'invidious' && backendFallback.value) {
      showToast(t('Falling back to Local API'))
      await performSearchLocal(payload)
    } else {
      isLoading.value = false
      // TODO: Show toast with error message
    }
  }
}

async function nextPage() {
  if (isNextPageLoading.value) return

  isNextPageLoading.value = true

  const payload = {
    query: processedQuery.value,
    searchSettings: searchSettings.value,
    options: {
      nextPageRef: nextPageRef.value
    }
  }

  if (apiUsed.value === 'local') {
    if (nextPageRef.value !== null) {
      showToast(t('Search Filters["Fetching results. Please wait"]'))
      await getNextpageLocal(payload)
    } else {
      showToast(t('Search Filters.There are no more results for this search'))
    }
  } else {
    showToast(t('Search Filters["Fetching results. Please wait"]'))
    await performSearchInvidious(payload)
  }

  isNextPageLoading.value = false
}

function replaceShownResults(history) {
  query.value = history.query
  shownResults.value = history.data
  searchSettings.value = history.searchSettings
  apiUsed.value = history.apiUsed

  if (history.nextPageRef != null) {
    nextPageRef.value = history.nextPageRef
  }

  if (typeof (history.searchPage) !== 'undefined') {
    searchPage.value = history.searchPage
  }

  // This is kept in case there is some race condition
  isLoading.value = false
}

/**
 * @param {any[]} results
 */
function updateSubscriptionDetails(results) {
  /** @type {Set<string>} */
  const subscribedChannelIds = store.getters.getSubscribedChannelIdSet

  const channels = []

  for (const result of results) {
    if (result.type !== 'channel' || !subscribedChannelIds.has(result.id ?? result.authorId)) {
      continue
    }

    if (result.dataSource === 'local') {
      channels.push({
        channelId: result.id,
        channelName: result.name,
        channelThumbnailUrl: result.thumbnail.replace(/^\/\//, 'https://')
      })
    } else {
      channels.push({
        channelId: result.authorId,
        channelName: result.author,
        channelThumbnailUrl: result.authorThumbnails[0].url.replace(/^\/\//, 'https://')
      })
    }
  }

  if (channels.length === 1) {
    store.dispatch('updateSubscriptionDetails', channels[0])
  } else if (channels.length > 1) {
    store.dispatch('batchUpdateSubscriptionDetails', channels)
  }
}
</script>

<style scoped src="./SearchPage.css" />
