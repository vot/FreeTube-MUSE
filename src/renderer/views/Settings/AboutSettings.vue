<template>
  <div>
    <FtSettingsSection
      :title="t('About.About')"
    >
      <section class="brand">
        <!-- <FtLogoFull class="logo" /> -->
        <h1>FreeTube-MUSE</h1>
        <p>Modern Usability Slop Edition</p>

        <p>{{ versionNumber }} {{ t('About.Beta') }}</p>

        <p>FreeTube-MUSE is a fork of <a href="https://github.com/FreeTubeApp/FreeTube">FreeTube</a><br />with a number of modifications.</p>
      </section>
      <section class="about-chunks">
        <figure
          v-for="chunk in chunks"
          :key="chunk.title"
          class="chunk"
        >
          <FontAwesomeIcon
            class="icon"
            :icon="chunk.icon"
          />
          <h3 class="title">
            {{ chunk.title }}
          </h3>
          <div
            v-safer-html="chunk.content"
            class="content"
          />
        </figure>
      </section>
    </FtSettingsSection>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import FtSettingsSection from '../../components/FtSettingsSection/FtSettingsSection.vue'
import FtLogoFull from '../../components/FtLogoFull/FtLogoFull.vue'
import { vSaferHtml } from '../../directives/vSaferHtml.js'

import { ABOUT_BITCOIN_ADDRESS } from '../../../constants'
import packageDetails from '../../../../package.json'

const { t } = useI18n()

const versionNumber = `v${packageDetails.version}`

const chunks = computed(() => [
  {
    icon: ['fab', 'github'],
    title: t('About.Source code'),
    content: [
      '<a href="https://github.com/vot/FreeTube-MUSE" lang="en" dir="ltr">GitHub: vot/FreeTube-MUSE</a>',
      t('About.Licensed under the {licenseLink}', {
        licenseLink: `<a href="https://www.gnu.org/licenses/agpl-3.0.en.html">${t('About.AGPLv3')}</a>`,
      }),
    ].join('<br>'),
  },
  {
    icon: ['fas', 'file-download'],
    title: t('About.Downloads / Changelog'),
    content: `<a href="https://github.com/vot/FreeTube-MUSE/releases">${t('About.GitHub releases')}</a>`,
  },
  // {
  //   icon: ['fas', 'file-download'],
  //   title: t('About.Downloads / Changelog'),
  //   content: `<a href="https://github.com/FreeTubeApp/FreeTube/releases">${t('About.GitHub releases')}</a>`,
  // },
  // {
  //   icon: ['fas', 'question-circle'],
  //   title: t('About.Help'),
  //   content: [
  //     `<a href="https://docs.freetubeapp.io/">${t('About.FreeTube Wiki')}</a>`,
  //     `<a href="https://docs.freetubeapp.io/faq/">${t('About.FAQ')}</a>`,
  //     `<a href="https://github.com/FreeTubeApp/FreeTube/discussions/">${t('About.Discussions')}</a>`
  //   ].join(' / '),
  // },
  {
    icon: ['fas', 'exclamation-circle'],
    title: t('About.Report a problem'),
    content: [
      `<a href="https://github.com/vot/FreeTube-MUSE/issues">${t('About.GitHub issues')}</a>`,
      t('About.Please check for duplicates before posting'),
    ].join('<br>'),
  },
  // {
  //   icon: ['fas', 'exclamation-circle'],
  //   title: t('About.Report a problem'),
  //   content: [
  //     `<a href="https://github.com/FreeTubeApp/FreeTube/issues">${t('About.GitHub issues')}</a>`,
  //     t('About.Please check for duplicates before posting'),
  //   ].join('<br>'),
  // },
  // {
  //   icon: ['fas', 'globe'],
  //   title: t('About.Website'),
  //   content: '<a href="https://freetubeapp.io/">https://freetubeapp.io/</a>',
  // },
  // {
  //   icon: ['fab', 'mastodon'],
  //   title: t('About.Mastodon'),
  //   content: '<a href="https://fosstodon.org/@FreeTube">@FreeTube@fosstodon.org</a>',
  // },
  // {
  //   icon: ['fab', 'matrix'],
  //   title: t('About.Chat on Matrix'),
  //   content: [
  //     '<a href="https://matrix.to/#/#freetube:matrix.org">#freetube:matrix.org</a>',
  //     t('About.Please read the {roomRulesLink}', {
  //       roomRulesLink: `<a href="https://docs.freetubeapp.io/community/matrix/">${t('About.room rules')}</a>`,
  //     }),
  //   ].join('<br>'),
  // },
  // {
  //   icon: ['fas', 'language'],
  //   title: t('About.Translate'),
  //   content: '<a href="https://hosted.weblate.org/engage/free-tube/">https://hosted.weblate.org/engage/free-tube/</a>',
  // },
  {
    icon: ['fas', 'users'],
    title: t('About.Credits'),
    content: t('About.FreeTube is made possible by {creditsPageLink}', {
      creditsPageLink: `<a href="https://docs.freetubeapp.io/credits/">${t('About.these people and projects')}</a>`,
    }),
  },
  // {
  //   icon: ['fab', 'bitcoin'],
  //   title: `${t('About.Donate')} - BTC`,
  //   content: `<a href="bitcoin:${ABOUT_BITCOIN_ADDRESS}">${ABOUT_BITCOIN_ADDRESS}</a>`
  // }
])
</script>

<style scoped src="./AboutSettings.css" />
