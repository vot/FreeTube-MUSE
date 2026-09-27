<template>
  <FtPrompt
    :label="$t('Global.Sort By')"
    theme="narrow"
    @click="close"
  >
    <FtFlexBox class="sortRadioFlexBox">
      <FtRadioButton
        v-model="sortByValue"
        title=""
        :labels="sortByNames"
        :values="sortByValues"
      />
    </FtFlexBox>
    <div class="sortButtonsContainer">
      <FtButton
        :label="$t('Apply')"
        @click="apply"
      />
      <FtButton
        :label="$t('Cancel')"
        :text-color="null"
        :background-color="null"
        @click="close"
      />
    </div>
  </FtPrompt>
</template>

<script setup>
import { ref } from 'vue'

import FtButton from '../FtButton/FtButton.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtPrompt from '../FtPrompt/FtPrompt.vue'
import FtRadioButton from '../FtRadioButton/FtRadioButton.vue'

const props = defineProps({
  selectedSortBy: {
    type: String,
    required: true
  },
  sortByNames: {
    type: Array,
    required: true
  },
  sortByValues: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['apply', 'close'])

/** @type {import('vue').Ref<string>} */
const sortByValue = ref(props.selectedSortBy)

function apply() {
  emit('apply', sortByValue.value)
}

function close() {
  emit('close')
}
</script>

<style scoped src="./FtSortByPrompt.css" />
