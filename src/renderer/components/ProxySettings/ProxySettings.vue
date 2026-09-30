<template>
  <FtSettingsSection
    :title="$t('Settings.Proxy Settings.Proxy Settings')"
  >
    <p
      v-if="useProxy"
      class="proxy-warning"
    >
      <FontAwesomeIcon
        :icon="['fas', 'circle-exclamation']"
        class="warning-icon"
      />
      {{ $t('Settings.Proxy Settings.Proxy Warning') }}
    </p>
    <FtSettingsTable>
      <FtSettingsTableRow
        :label="$t('Settings.Proxy Settings.Enable Tor / Proxy')"
      >
        <FtToggleSwitch
          :label="$t('Settings.Proxy Settings.Enabled')"
          :default-value="useProxy"
          :compact="true"
          @change="handleUpdateProxy"
        />
      </FtSettingsTableRow>
      <FtSettingsTableRow
        v-if="useProxy"
        :label="$t('Settings.Proxy Settings.Proxy Protocol')"
      >
        <FtSelect
          :placeholder="$t('Settings.Proxy Settings.Proxy Protocol')"
          :value="proxyProtocol"
          :select-names="PROTOCOL_NAMES"
          :select-values="PROTOCOL_VALUES"
          :icon="['fas', 'network-wired']"
          @change="handleUpdateProxyProtocol"
        />
      </FtSettingsTableRow>
      <FtSettingsTableRow
        v-if="useProxy"
        :label="$t('Settings.Proxy Settings.Proxy Host')"
      >
        <FtInput
          :placeholder="$t('Settings.Proxy Settings.Proxy Host')"
          :show-action-button="false"
          :value="proxyHostname"
          @input="handleUpdateProxyHostname"
          @keydown.enter="checkYourIp"
        />
      </FtSettingsTableRow>
      <FtSettingsTableRow
        v-if="useProxy"
        :label="$t('Settings.Proxy Settings.Proxy Port Number')"
      >
        <FtInput
          :placeholder="$t('Settings.Proxy Settings.Proxy Port Number')"
          :show-action-button="false"
          :value="proxyPort"
          :maxlength="5"
          @input="handleUpdateProxyPort"
          @keydown.enter="checkYourIp"
        />
      </FtSettingsTableRow>
      <FtSettingsTableRow
        v-if="useProxy && areCredentialsSupported"
        :label="$t('Settings.Proxy Settings.Proxy Username')"
      >
        <FtInput
          :placeholder="$t('Settings.Proxy Settings.Proxy Username')"
          :show-action-button="false"
          :value="proxyUsername"
          @input="handleUpdateProxyUsername"
          @keydown.enter="checkYourIp"
        />
      </FtSettingsTableRow>
      <FtSettingsTableRow
        v-if="useProxy && areCredentialsSupported"
        :label="$t('Settings.Proxy Settings.Proxy Password')"
      >
        <FtInput
          :placeholder="$t('Settings.Proxy Settings.Proxy Password')"
          :show-action-button="false"
          :value="proxyPassword"
          input-type="password"
          @input="handleUpdateProxyPassword"
          @keydown.enter="checkYourIp"
        />
      </FtSettingsTableRow>
      <FtSettingsTableRow
        :label="$t('Settings.Proxy Settings.Check Your IP')"
        :tooltip="$t('Tooltips.Proxy Settings.Check Your IP', { url: ipCheckUrl })"
      >
        <div class="ipCheck">
          <FtButton
            :label="$t('Settings.Proxy Settings.Check Your IP')"
            :disabled="isLoading"
            @click="checkYourIp"
          />
          <p v-if="isLoading">
            {{ $t('Settings.Proxy Settings.Checking') }}
          </p>
          <div
            v-if="dataAvailable"
            class="ipDetails"
          >
            <p>
              <strong>{{ $t('Settings.Proxy Settings.YourIP') }}:</strong>
              {{ proxyIp }}
            </p>
            <p>
              <strong>{{ $t('Settings.Proxy Settings.YourLocation') }}:</strong>
              {{ proxyCity }}, {{ proxyRegion }}, {{ proxyCountry }}
            </p>
          </div>
        </div>
      </FtSettingsTableRow>
    </FtSettingsTable>
  </FtSettingsSection>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import FtSettingsSection from '../FtSettingsSection/FtSettingsSection.vue'
import FtSettingsTable from '../FtSettingsTable/FtSettingsTable.vue'
import FtSettingsTableRow from '../FtSettingsTableRow/FtSettingsTableRow.vue'
import FtToggleSwitch from '../FtToggleSwitch/FtToggleSwitch.vue'
import FtButton from '../FtButton/FtButton.vue'
import FtSelect from '../FtSelect/FtSelect.vue'
import FtInput from '../FtInput/FtInput.vue'

import store from '../../store/index'

import { debounce, showToast } from '../../helpers/utils'

const { locale, t } = useI18n()

const PROTOCOL_NAMES = [
  'HTTP',
  'HTTPS',
  'SOCKS4',
  'SOCKS5'
]

const PROTOCOL_VALUES = [
  'http',
  'https',
  'socks4',
  'socks5'
]

const isLoading = ref(false)
const dataAvailable = ref(false)
const proxyIp = ref('')
const proxyCountry = ref('')
const proxyRegion = ref('')
const proxyCity = ref('')

/** @type {import('vue').ComputedRef<boolean>} */
const useProxy = computed(() => {
  return store.getters.getUseProxy
})

/** @type {import('vue').ComputedRef<string>} */
const proxyProtocol = computed(() => {
  return store.getters.getProxyProtocol
})

/** @type {import('vue').ComputedRef<string>} */
const proxyHostname = computed(() => {
  return store.getters.getProxyHostname
})

/** @type {import('vue').ComputedRef<string>} */
const proxyPort = computed(() => {
  return store.getters.getProxyPort
})

/** @type {import('vue').ComputedRef<string>} */
const proxyUsername = computed(() => {
  return store.getters.getProxyUsername
})

/** @type {import('vue').ComputedRef<string>} */
const proxyPassword = computed(() => {
  return store.getters.getProxyPassword
})

const proxyUrl = computed(() => {
  return `${proxyProtocol.value}://${proxyHostname.value}:${proxyPort.value}`
})

// locales found here: https://ipwhois.io/documentation
const SUPPORTED_LANGS = ['en', 'ru', 'de', 'es', 'pt-BR', 'fr', 'zh-CN', 'ja']

const localeToUse = computed(() => {
  const freeTubeLang = locale.value

  return SUPPORTED_LANGS.find(lang => freeTubeLang === lang) ?? SUPPORTED_LANGS.find(lang => freeTubeLang.slice(0, 2) === lang.slice(0, 2))
})

const ipCheckUrl = computed(() => {
  let url = 'https://ipwho.is/?output=json&fields=ip,country,city,region'

  if (localeToUse.value) {
    url += `&lang=${localeToUse.value}`
  }

  return url
})

/** @type {import('vue').ComputedRef<boolean>} */
const areCredentialsSupported = computed(() => {
  return proxyProtocol.value === 'http' || proxyProtocol.value === 'https'
})

/**
 * @param {boolean} enabled
 */
function handleUpdateProxy(enabled) {
  if (enabled) {
    enableProxy()
  } else {
    disableProxy()
  }

  store.dispatch('updateUseProxy', enabled)
}

/**
 * @param {string} value
 */
function handleUpdateProxyProtocol(value) {
  if (useProxy.value) {
    enableProxy()
  }

  store.dispatch('updateProxyProtocol', value)
}

/**
 * @param {string} value
 */
function handleUpdateProxyHostname(value) {
  if (useProxy.value) {
    debouncedEnableProxy()
  }

  store.dispatch('updateProxyHostname', value)
}

onBeforeUnmount(() => {
  if (proxyHostname.value === '') {
    store.dispatch('updateProxyHostname', '127.0.0.1')
  }

  if (proxyPort.value === '') {
    store.dispatch('updateProxyPort', '9050')
  }
})

/**
 * @param {string} value
 */
function handleUpdateProxyPort(value) {
  if (useProxy.value) {
    debouncedEnableProxy()
  }

  store.dispatch('updateProxyPort', value)
}

/**
 * @param {string} value
 */
function handleUpdateProxyUsername(value) {
  if (useProxy.value) {
    debouncedEnableProxy()
  }

  store.dispatch('updateProxyUsername', value)
}

/**
 * @param {string} value
 */
function handleUpdateProxyPassword(value) {
  if (useProxy.value) {
    debouncedEnableProxy()
  }

  store.dispatch('updateProxyPassword', value)
}

function enableProxy() {
  if (process.env.IS_ELECTRON) {
    window.ftElectron.enableProxy(proxyUrl.value)
  }
}

const debouncedEnableProxy = debounce(enableProxy, 200)

function disableProxy() {
  if (process.env.IS_ELECTRON) {
    window.ftElectron.disableProxy()
  }

  dataAvailable.value = false
  proxyIp.value = ''
  proxyCountry.value = ''
  proxyRegion.value = ''
  proxyCity.value = ''
}

/**
 * Asks ipwho.is who FreeTube currently looks like it is, which is the proxy's
 * address while a proxy is enabled and FreeTube's own address otherwise.
 *
 * The proxy is deliberately left exactly as the user configured it instead of
 * being forced on and off around the request. This is reachable with the proxy
 * disabled, where turning it on would check a proxy the user has not asked to
 * use, and turning it back off afterwards would throw the answer away.
 * @returns {Promise<void>}
 */
async function checkYourIp() {
  isLoading.value = true

  try {
    const response = await fetch(ipCheckUrl.value)
    const json = await response.json()

    proxyIp.value = json.ip
    proxyCountry.value = json.country
    proxyRegion.value = json.region
    proxyCity.value = json.city
    dataAvailable.value = true
  } catch (error) {
    console.error('errored while getting network information:', error)
    dataAvailable.value = false
    showToast(errorMessage())
  } finally {
    isLoading.value = false
  }
}

/**
 * A failed request only points at the proxy when a proxy is what FreeTube is
 * going through, as without one there is nothing of the user's own to
 * misconfigure
 * @returns {string}
 */
function errorMessage() {
  return useProxy.value
    ? t('Settings.Proxy Settings["Error getting network information. Is your proxy configured properly?"]')
    : t('Settings.Proxy Settings.Error getting network information')
}
</script>

<style scoped src="./ProxySettings.css" />
