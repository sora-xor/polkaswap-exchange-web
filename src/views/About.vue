<template>
  <div class="layout s-flex">
    <div class="background s-flex"></div>
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
                  <span class="bold" style="font-size: 18px;">{{ t(`about.${topic.title}.title`) }}</span>
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
.layout {
  flex-direction: column;
  height: 100%;
  .background {
    min-height: 120px;
    height: 256px;
    background-image: url("~@/assets/background.png");
    background-size: cover;
    background-repeat: no-repeat;
    align-items: center;
    justify-content: center;
  }
  .content {
    padding: 30px 60px;
    .terms {
      > span {
        font-size: 36px;
      }
      .web3-logo {
        flex-direction: column;
        margin-left: 10%;
        > span {
          color: #A1A1A0;
          font-size: 12px;
        }
        .logo {
          margin-top: 12px;
          background-image: url('~@/assets/web3-logo.svg');
          width: 112px;
          height: 48px;
        }
      }
    }
    .articles {
      .article-card {
        background-color: #F5F7F8;
        border-color: transparent;
        border-radius: 24px;
        margin: 4px;
        height: 140px;
        font-size: 14px;
        .article-header {
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
@media (max-width: 900px) {
  .layout .content .terms > span {
    font-size: 24px;
  }
}
@media (max-width: 600px) {
  .layout .content .terms > span {
    font-size: 16px;
    font-weight: bold;
  }
}
</style>
