<template>
  <div
    ref="menuRef"
    class="sideNavMoreOptions"
  >
    <div
      class="navOption moreOptionNav"
      tabindex="0"
      role="button"
      aria-labelledby="moreNavLabel"
      :title="$t('More')"
      @click="openMoreOptions = !openMoreOptions"
      @keydown.enter.space.prevent="openMoreOptions = !openMoreOptions"
    >
      <FontAwesomeIcon
        :icon="['fas', 'ellipsis-h']"
        class="navIcon"
      />
      <p
        id="moreNavLabel"
        class="navLabel"
      >
        {{ $t("More") }}
      </p>
    </div>
    <div
      v-if="openMoreOptions"
      class="moreOptionContainer"
    >
      <router-link
        class="navOption mobileHidden"
        :title="$t('Channels.Channels')"
        to="/subscribedchannels"
        @click="closeMenu"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'user-check']"
            class="navIcon"
          />
        </div>
        <p
          id="channelLabel"
          class="navLabel"
        >
          {{ $t("Channels.Channels") }}
        </p>
      </router-link>
      <router-link
        v-if=" SUPPORTS_LOCAL_API && trendingVisible"
        class="navOption"
        :title="$t('Trending.Trending')"
        to="/trending"
        @click="closeMenu"
      >
        <FontAwesomeIcon
          :icon="['fas', 'fire']"
          class="navIcon"
        />
        <p
          id="trendingNavLabel"
          class="navLabel"
        >
          {{ $t("Trending.Trending") }}
        </p>
      </router-link>
      <router-link
        v-if="popularVisible"
        class="navOption"
        :title="$t('Most Popular')"
        to="/popular"
        @click="closeMenu"
      >
        <FontAwesomeIcon
          :icon="['fas', 'users']"
          class="navIcon"
        />
        <p
          id="mostPopularNavLabel"
          class="navLabel"
        >
          {{ $t("Most Popular") }}
        </p>
      </router-link>
    </div>
    <router-link
      class="navOption mobileShow"
      :title="$t('History.History')"
      to="/history"
    >
      <FontAwesomeIcon
        :icon="['fas', 'history']"
        class="navIcon"
      />
      <p
        id="historyNavLabel"
        class="navLabel"
      >
        {{ $t("History.History") }}
      </p>
    </router-link>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'

import store from '../../store/index'

const SUPPORTS_LOCAL_API = process.env.SUPPORTS_LOCAL_API

const openMoreOptions = ref(false)

const menuRef = useTemplateRef('menuRef')

/** @type {import('vue').ComputedRef<boolean>} */
const trendingVisible = computed(() => {
  return !store.getters.getHideTrendingVideos &&
    (store.getters.getBackendFallback || store.getters.getBackendPreference === 'local')
})

/** @type {import('vue').ComputedRef<boolean>} */
const popularVisible = computed(() => {
  return !store.getters.getHidePopularVideos &&
    (store.getters.getBackendFallback || store.getters.getBackendPreference === 'invidious')
})

function closeMenu() {
  openMoreOptions.value = false
}

function handleClickOutside(event) {
  if (openMoreOptions.value && menuRef.value && !menuRef.value.contains(event.target)) {
    closeMenu()
  }
}

const router = useRouter()

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  router.afterEach(() => {
    closeMenu()
  })
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped src="./SideNavMoreOptions.css" />
