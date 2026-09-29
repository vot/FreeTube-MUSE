<template>
  <tr class="settingsTableRow">
    <th
      scope="row"
    >
      <div class="rowLabel">
        <span>{{ label }}</span>
        <FtTooltip
          v-if="tooltip !== ''"
          :tooltip="tooltip"
          position="bottom"
        />
      </div>
    </th>
    <td>
      <div class="rowValue">
        <slot />
      </div>
    </td>
  </tr>
</template>

<script setup>
import FtTooltip from '../FtTooltip/FtTooltip.vue'

defineProps({
  label: {
    type: String,
    required: true
  },
  tooltip: {
    type: String,
    default: ''
  }
})
</script>

<style scoped src="./FtSettingsTableRow.scss" lang="scss" />
