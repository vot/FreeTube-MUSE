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
        class="promptCard"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="id"
      >
        <h2
          :id="id"
          class="center"
        >
          {{ t('Settings.Backend Settings.Health Check.Details Title') }}
        </h2>

        <p class="center">
          {{ t('Settings.Backend Settings.Health Check.Details Description', { check: checkLabel }) }}
        </p>

        <pre class="responseBody">{{ truncatedBody }}</pre>

        <FtButton
          :label="t('Settings.Backend Settings.Health Check.Details Close')"
          @click="handleClose"
        />
      </FtCard>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import store from '../../store/index'

import FtCard from '../ft-card/ft-card.vue'
import FtButton from '../FtButton/FtButton.vue'

const props = defineProps({
  body: {
    type: String,
    required: true
  },
  checkLabel: {
    type: String,
    required: true
  },
  inert: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const { t } = useI18n()

const id = useId()

let lastActiveElement = null

/*
  An instance can answer with a page far larger than a modal can show, so the
  body is cut off instead of being rendered in full. The point of the prompt is
  to reveal what came back, and the beginning of a challenge page or an error
  message already says most of what there is to know.
*/
const MAX_LENGTH = 100_000
const TRUNCATION_NOTICE = '\n\n[…truncated]'

const truncatedBody = computed(() => {
  if (props.body.length === 0) {
    // An empty body is a real answer, and the one an empty <pre> explains least
    return t('Settings.Backend Settings.Health Check.Details Empty Response')
  }

  if (props.body.length <= MAX_LENGTH) {
    return props.body
  }

  return props.body.slice(0, MAX_LENGTH) + TRUNCATION_NOTICE
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

function handleClose() {
  emit('close')
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
  }
}
</script>

<style scoped src="./InstanceHealthDetailsPrompt.css" />
