<template>
  <Teleport to=".app">
    <div
      class="prompt"
      tabindex="-1"
      :inert="inert"
      @click.self="handleClose"
      @keydown.enter.self="handleClose"
    >
      <FtCard
        ref="promptCard"
        class="promptCard"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="id"
      >
        <h2
          :id="id"
          class="center"
        >
          {{ $t('Instance Challenge.Title') }}
        </h2>

        <p class="center">
          {{ $t('Instance Challenge.Description', { instanceUrl }) }}
        </p>

        <div class="iframeWrapper">
          <iframe
            class="challengeFrame"
            :title="$t('Instance Challenge.Title')"
            :src="url"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerpolicy="no-referrer"
          />
        </div>

        <FtButton
          :label="$t('Instance Challenge.Close')"
          @click="handleClose"
        />
      </FtCard>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, useId } from 'vue'

import store from '../../store/index'

import FtCard from '../ft-card/ft-card.vue'
import FtButton from '../FtButton/FtButton.vue'

const props = defineProps({
  url: {
    type: String,
    required: true
  },
  inert: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const id = useId()

let lastActiveElement = null

// The frame keeps whatever the user makes of the challenge, and is only pointed
// at another url when the instance refuses a different one. Reloading it while a
// challenge is in progress makes Anubis hand out a second challenge for the same
// verification cookie, which it then rejects as a double spend, so the main
// process debounces the urls that get reported here.
const instanceUrl = computed(() => {
  try {
    return new URL(props.url).origin
  } catch {
    return props.url
  }
})

onMounted(() => {
  lastActiveElement = document.activeElement
  document.addEventListener('keydown', handleEscape, true)
  store.commit('addOpenPrompt', id)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape, true)
  store.commit('removeOpenPrompt', id)
  lastActiveElement?.focus()
})

function handleClose () {
  emit('close')
}

function handleEscape (event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
  }
}
</script>

<style scoped src="./InstanceChallengePrompt.css" />
