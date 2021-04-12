<template>
  <div class="layout s-flex">
    <!-- TODO: Move the text below above the banner for mobile devices, add background layer with opacity for the banner -->
    <!--div class="banner"/-->
    <div class="content">
      <div class="terms s-flex">
        <h1 class="title">{{ t('about.polkaswapText') }}</h1>
        <i class="web3-logo" />
      </div>
      <!--div class="links s-flex">
        <s-button type="primary" @click="handleClickExchange">
          {{ t('about.openExchange') }}
        </s-button>
        <s-button type="link" icon="external-link-16" @click="handleGoToMedium">
          {{ t('about.mediumLink') }}
        </s-button>
        <s-button type="link" icon="external-link-16" @click="handleGoToGithub">
          {{ t('about.githubLink') }}
        </s-button>
      </div-->
      <div class="articles s-flex">
        <s-row>
          <s-col :lg="3" :md="4" :sm="6" :xs="12" v-for="topic in AboutTopics" :key="topic.title">
            <s-card class="article-card" border-radius="big" shadow="never">
              <template #header>
                <h4 class="title">
                  <s-icon :size="24" :name="topic.icon" />
                  {{ t(`about.${topic.title}.title`) }}
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
    location.href = 'https://medium.com/polkaswap'
  }

  handleGoToGithub (): void {
    location.href = 'https://github.com/sora-xor'
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
$logo-width: 140px;

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
    padding: $inner-spacing-big $inner-spacing-mini;
    .terms, .links {
      padding-right: $inner-spacing-medium;
      padding-left: $inner-spacing-medium;
    }
    .terms {
      margin-bottom: $inner-spacing-big;
      .title {
        margin-top: 0;
        margin-right: $inner-spacing-mini;
        margin-bottom: 0;
        width: calc(100% - #{$logo-width} - #{$inner-spacing-medium});
        color: var(--s-color-brand-day);
        font-size: var(--s-heading5-font-size);
        font-feature-settings: $s-font-feature-settings-title;
        letter-spacing: $s-letter-spacing-mini;
        font-weight: 600;
      }
      .web3-logo {
        margin-left: auto;
        margin-top: $inner-spacing-small;
        background-image: url('~@/assets/img/web3-logo.svg');
        width: $logo-width;
        height: 48px;
      }
    }
    .links {
      display: flex;
      align-items: center;
    }
    .s-primary {
      & + .s-link {
        margin-left: $inner-spacing-medium;
      }
    }
    .s-link {
      color: var(--s-color-theme-accent);
      padding: 0;
      &:hover, &:active, &:focus {
        color: var(--s-color-base-content-primary);
      }
    }
    .articles {
      margin-top: $inner-spacing-big;
    }
    .article-card {
      margin: $inner-spacing-mini / 2;
      background-color: var(--s-color-base-background);
      border-color: transparent;
      color: var(--s-color-base-content-secondary);
      letter-spacing: $s-letter-spacing-medium;
      font-feature-settings: $s-font-feature-settings-card-body;
      .title {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        line-height: $s-line-height-small;
        font-feature-settings: $s-font-feature-settings-card-title;
        font-weight: 600;
        i {
          color: var(--s-color-theme-accent);
          margin-bottom: $inner-spacing-small;
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
@include large-mobile {
  .layout {
    .articles .s-col-sm-6 {
      width: 50%;
    }
    .content .article-card {
      height: 186px;
    }
  }
}
@include tablet {
  .layout {
    .banner {
      height: 256px;
    }
    .content {
      padding-right: $inner-spacing-mini * 4;
      padding-left: $inner-spacing-mini * 4;
      .terms, .links {
        padding-right: 0;
        padding-left: 0;
      }
      .terms .title {
        font-size: var(--s-heading3-font-size);
        font-weight: 400;
        max-width: 75%;
        width: 100%;
      }
      .s-primary + .s-link {
        margin-left: $inner-spacing-mini * 4;
      }
    }
  }
}
@include desktop {
  .layout {
    .articles .s-col-sm-6 {
      width: 25%;
    }
    .content {
      .terms .title {
        font-size: var(--s-heading1-font-size);
        line-height: $s-line-height-mini;
      }
      .article-card {
        height: 209px;
      }
    }
  }
}
@include large-desktop {
  .layout {
    .content {
      .article-card {
        height: 186px;
      }
    }
  }
}
@include huge-desktop {
  .layout {
    .content {
      .article-card {
        height: 140px;
      }
    }
  }
}
</style>
