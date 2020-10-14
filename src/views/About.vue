<template>
  <div class="layout s-flex">
    <div class="banner s-flex"></div>
    <div class="content">
      <div class="terms s-flex">
        <span>{{ t('about.polkaswapText') }}</span>
        <div class="web3-logo s-flex">
          <span>{{ t('about.fundedBy') }}</span>
          <i class="logo" />
        </div>
      </div>
      <s-divider />
      <div class="links s-flex">
        <s-button type="primary" size="medium" @click="handleClickExchange">
          {{ t('about.openExchange') }}
        </s-button>
        <s-button type="link" size="medium" icon="external-link" @click="handleGoToMedium">
          {{ t('about.mediumLink') }}
        </s-button>
        <s-button type="link" size="medium" icon="external-link" @click="handleGoToGithub">
          {{ t('about.githubLink') }}
        </s-button>
      </div>
      <s-divider />
      <div class="articles s-flex">
        <s-row>
          <s-col :lg="3" :md="4" :sm="6" :xs="12" v-for="topic in AboutTopics" :key="topic.title">
            <s-card class="article-card" clickable>
              <template #header>
                <div class="article-header">
                  {{ t(`about.${topic.title}.title`) }}
                  <s-icon :size="24" :name="topic.icon" />
                </div>
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
  }

  handleGoToMedium (): void {
  }

  handleGoToGithub (): void {
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/colors';
@import '../styles/breakpoints';
@import '../styles/typography';
@import '../styles/layout';

.layout {
  flex-direction: column;
  height: 100%;
  .banner {
    min-height: 120px;
    height: 256px;
    background-image: url("~@/assets/img/about-banner.png");
    background-size: cover;
    background-repeat: no-repeat;
    align-items: center;
    justify-content: center;
  }
  .content {
    padding: $basic-spacing_medium $basic-spacing_large;
    .terms {
      > span {
        font-size: $font-size_normal;
        font-weight: bold;
      }
      .web3-logo {
        flex-direction: column;
        margin-left: 10%;
        > span {
          color: $color-grey;
          font-size: $font-size_small;
        }
        .logo {
          margin-top: 12px;
          background-image: url('~@/assets/img/web3-logo.svg');
          width: 112px;
          height: 48px;
        }
      }
    }
    .articles {
      .article-card {
        background-color: $color-grey_light;
        border-color: transparent;
        border-radius: 24px;
        margin: 4px;
        height: 140px;
        .article-header {
          font-size: 1.285rem;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          i {
            color: var(--s-color-main-brand);
          }
        }
      }
    }
  }
}
@include tablet {
  .layout .content .terms > span {
    font-size: $font-size_medium;
    font-weight: normal;
  }
}
@include desktop {
  .layout .content .terms > span {
    font-size: $font-size_large;
  }
}
</style>
