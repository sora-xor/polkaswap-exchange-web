<template>
  <div class="layout s-flex">
    <!-- TODO: Move the text below above the banner for mobile devices, add background layer with opacity for the banner -->
    <div class="banner"/>
    <div class="content">
      <div class="terms s-flex">
        <h1 class="title">{{ t('about.polkaswapText') }}</h1>
        <div class="web3-logo s-flex">
          <span>{{ t('about.fundedBy') }}</span>
          <i class="logo" />
        </div>
      </div>
      <s-divider />
      <div class="links s-flex">
        <s-button type="primary" @click="handleClickExchange">
          {{ t('about.openExchange') }}
        </s-button>
        <!-- TODO: Add links to Medium and Github -->
        <s-button type="link" icon="external-link" @click="handleGoToMedium">
          {{ t('about.mediumLink') }}
        </s-button>
        <s-button type="link" icon="external-link" @click="handleGoToGithub">
          {{ t('about.githubLink') }}
        </s-button>
      </div>
      <s-divider />
      <div class="articles s-flex">
        <s-row>
          <s-col :lg="3" :md="4" :sm="6" :xs="12" v-for="topic in AboutTopics" :key="topic.title">
            <s-card class="article-card" borderRadius="big" shadow='never'>
              <template #header>
                <h4 class="title">
                  {{ t(`about.${topic.title}.title`) }}
                  <s-icon :size="24" :name="topic.icon" />
                </h4>
              </template>
              <span>{{ t(`about.${topic.title}.text`) }}</span>
            </s-card>
          </s-col>
        </s-row>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { AboutTopics, PageNames } from '@/consts'
import router from '@/router'

@Component
export default class About extends Mixins(TranslationMixin) {
  readonly AboutTopics = AboutTopics

  handleClickExchange (): void {
    router.push({ name: PageNames.Swap })
  }

  handleGoToMedium (): void {
  }

  handleGoToGithub (): void {
  }
}
</script>

<style lang="scss">
.article-card {
  .el-card__body {
    line-height: $s-line-height-base;
  }
}
</style>

<style lang="scss" scoped>
.layout {
  flex-direction: column;
  height: 100%;
  .banner {
    margin-top: $inner-spacing-mini;
    margin-left: auto;
    margin-right: auto;
    width: calc(100% - #{$inner-spacing-mini} * 2);
    height: 120px;
    background-image: url("~@/assets/img/about-banner.png");
    background-size: contain;
    background-repeat: repeat-x;
    flex-shrink: 0;
  }
  .content {
    padding: $inner-spacing-big $inner-spacing-mini * 4;
    .terms {
      .title {
        margin-top: 0;
        margin-right: $inner-spacing-mini;
        margin-bottom: 0;
        max-width: 75%;
        font-size: var(--s-heading5-font-size);
        font-weight: $s-font-weight-medium;
        color: var(--s-color-brand-day);
        letter-spacing: $s-letter-spacing-mini;
        font-feature-settings: $s-font-feature-settings-title;
      }
      .web3-logo {
        flex-direction: column;
        margin-left: auto;
        > span {
          color: var(--s-color-base-content-secondary);
          font-size: var(--s-font-size-mini);
        }
        .logo {
          margin-top: $inner-spacing-small;
          background-image: url('~@/assets/img/web3-logo.svg');
          width: 140px;
          height: 48px;
        }
      }
    }
    .links {
      display: flex;
      align-items: center;
    }
    .s-link {
      color: var(--s-color-theme-accent);
      padding: 0;
      &:hover, &:active, &:focus {
        color: var(--s-color-base-content-primary);
      }
      & + .s-link {
        margin-left: $inner-spacing-medium;
      }
    }
    .s-primary + .s-link {
      margin-left: $inner-spacing-mini * 4;
    }
    .article-card {
      margin: $inner-spacing-mini / 2;
      height: 140px;
      background-color: var(--s-color-base-background);
      border-color: transparent;
      color: var(--s-color-base-content-tertiary);
      letter-spacing: $s-letter-spacing-medium;
      font-feature-settings: $s-font-feature-settings-card-body;
      .title {
        display: flex;
        justify-content: space-between;
        line-height: $s-line-height-small;
        font-weight: $s-font-weight-medium;
        font-feature-settings: $s-font-feature-settings-card-title;
        i {
          color: var(--s-color-theme-accent);
        }
      }
    }
  }
}
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .layout {
    .banner {
      background-image: url("~@/assets/img/about-banner@2x.png");
    }
  }
}
@include tablet {
  .layout {
    .banner {
      height: 256px;
    }
    .content .terms .title {
      font-size: var(--s-heading3-font-size);
      font-weight: normal;
    }
  }
}
@include desktop {
  .layout .content .terms .title {
    font-size: var(--s-heading1-font-size);
    line-height: $s-line-height-mini;
  }
}
</style>
