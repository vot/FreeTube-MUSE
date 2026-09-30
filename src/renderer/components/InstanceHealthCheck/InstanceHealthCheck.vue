<template>
  <div class="healthCheck">
    <div class="controls">
      <FtButton
        :label="isRunning ? t('Settings.Backend Settings.Health Check.Checking') : t('Settings.Backend Settings.Health Check.Check Instance')"
        :icon="['fas', 'check']"
        :disabled="isRunning"
        @click="startCheck"
      />
      <button
        v-if="summary !== ''"
        type="button"
        class="summary"
        :aria-expanded="isExpanded"
        @click="isExpanded = !isExpanded"
      >
        {{ summary }}
      </button>
    </div>

    <ul
      v-if="isExpanded && results.length > 0"
      class="results"
    >
      <li
        v-for="result in results"
        :key="result.id"
        class="result"
        :class="result.status"
      >
        <FontAwesomeIcon
          class="statusIcon"
          :icon="statusIcon(result)"
          :spin="result.id === 'reachable' && isRunning"
        />
        <span class="resultLabel">{{ resultLabel(result.id) }}</span>
        <span class="resultDetail">{{ result.detail }}</span>
        <FtButton
          v-if="result.challengeUrl"
          class="challengeButton"
          :label="t('Settings.Backend Settings.Health Check.Pass Challenge')"
          @click="passChallenge(result.challengeUrl)"
        />
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import FtButton from '../FtButton/FtButton.vue'

import { runInvidiousHealthCheck } from '../../helpers/api/invidiousHealthCheck'
import { openBlockedResource } from '../../helpers/api/invidious'

const props = defineProps({
  instance: {
    type: String,
    required: true
  },
  proxiesVideos: {
    type: Boolean,
    default: false
  }
})

const { t } = useI18n()

/** @type {import('vue').Ref<import('../../helpers/api/invidiousHealthCheck').HealthCheckResult[]>} */
const results = ref([])
const isRunning = ref(false)
const isExpanded = ref(false)

/**
 * The instance that the most recent run was started for, so that a run that
 * finishes after the user moved on to another instance can be thrown away
 * instead of overwriting the results of the newer run
 */
let checkedInstance = ''

const STATUS_ICONS = {
  ok: ['fas', 'circle-check'],
  warning: ['fas', 'triangle-exclamation'],
  error: ['fas', 'circle-xmark']
}

/**
 * @param {import('../../helpers/api/invidiousHealthCheck').HealthCheckId} id
 * @returns {string}
 */
function resultLabel(id) {
  switch (id) {
    case 'reachable':
      return t('Settings.Backend Settings.Health Check.Reachable')
    case 'api':
      return t('Settings.Backend Settings.Health Check.Api')
    case 'cors':
      return t('Settings.Backend Settings.Health Check.Cors')
    default:
      return t('Settings.Backend Settings.Health Check.Video')
  }
}

/**
 * The reachable check is the one that visibly runs, as the other three are
 * skipped when it fails and so never get to report anything
 * @param {import('../../helpers/api/invidiousHealthCheck').HealthCheckResult} result
 * @returns {[string, string]}
 */
function statusIcon(result) {
  if (result.id === 'reachable' && isRunning.value) {
    return ['fas', 'spinner']
  }

  return STATUS_ICONS[result.status]
}

const summary = computed(() => {
  if (isRunning.value || results.value.length === 0) {
    return ''
  }

  const errors = results.value.filter((result) => result.status === 'error').length
  const warnings = results.value.filter((result) => result.status === 'warning').length

  if (errors > 0) {
    return t('Settings.Backend Settings.Health Check.Problems Found', { count: errors })
  }

  if (warnings > 0) {
    return t('Settings.Backend Settings.Health Check.Warnings Found', { count: warnings })
  }

  return t('Settings.Backend Settings.Health Check.All Checks Passed')
})

/**
 * @returns {Promise<void>}
 */
async function startCheck() {
  const instance = props.instance.trim()

  if (instance === '') {
    return
  }

  checkedInstance = instance
  isRunning.value = true
  results.value = []

  try {
    const checkResults = await runInvidiousHealthCheck(instance, {
      proxiesVideos: props.proxiesVideos
    })

    if (checkedInstance !== instance) {
      return
    }

    results.value = checkResults
    isExpanded.value = true
  } catch (err) {
    console.error(err)
    results.value = []
  } finally {
    if (checkedInstance === instance) {
      isRunning.value = false
    }
  }
}

/**
 * Opens the bot challenge page for a url, which is what actually resolves a
 * challenge. This is a button instead of something the check does on its own, as
 * passing a challenge restarts the app, and the checks run again on startup: an
 * automatic challenge would reopen the modal right after the user dismissed it,
 * leaving no way out of it.
 * @param {string} url
 * @returns {void}
 */
function passChallenge(url) {
  openBlockedResource(url)
}

// The instance is only committed to the store once the input loses focus, so
// this covers the instance the app started up with as well as every instance
// the user switches to afterwards
watch(() => props.instance, startCheck, { immediate: true })

onBeforeUnmount(() => {
  // any run that is still in flight is now for an instance that is gone
  checkedInstance = ''
})
</script>

<style scoped src="./InstanceHealthCheck.css" />
