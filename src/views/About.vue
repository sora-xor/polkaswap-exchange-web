<template>
  <div class="layout">
    <div class="content">
      <div class="about-main">
        <img src="@/assets/about/about01.png" draggable="false" class="main unselectable" />
        <div class="about-main-title">
          <p class="gradient main">{{ t('about.title') }}</p>
        </div>
        <div class="about-main-text">
          <p class="text">{{ t('about.description') }}</p>
        </div>
        <img src="@/assets/about/web3.png" draggable="false" class="web3 unselectable" />
      </div>
      <div class="about-trading">
        <img src="@/assets/about/about02.png" draggable="false" class="unselectable">
        <div class="about-trading-title">
          <p class="gradient trading">{{ t('about.trading.title') }}</p>
        </div>
        <div class="about-trading-block-1">
          <p class="text">{{ t('about.trading.first') }}</p>
        </div>
        <div class="about-trading-block-2">
          <div class="bubble-block">
            <img src="@/assets/about/about02-1.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">{{ t('about.trading.second') }}</p>
          </div>
        </div>
        <div class="about-trading-block-3">
          <div class="bubble-block">
            <img src="@/assets/about/about02-2.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">{{ t('about.trading.third') }}
              <a href="https://en.wikipedia.org/wiki/BSD_licenses#4-clause_license_(original_%22BSD_License%22)" title="BSD 4-clause license" class="text">BSD 4-clause license</a></p>
          </div>
        </div>
        <img src="@/assets/about/about02-shadow-1.png" draggable="false" class="unselectable about-trading-shadow-1">
      </div>
      <div class="about-liquidity">
        <img src="@/assets/about/about03.png" draggable="false" class="unselectable">
        <div class="about-liquidity-title">
          <p class="gradient liquidity">{{ t('about.liquidity.title') }}</p>
        </div>
        <div class="about-liquidity-block-1">
          <p class="text">{{ t('about.liquidity.first') }}</p>
        </div>
        <div class="about-liquidity-block-2">
          <div class="bubble-block">
            <img src="@/assets/about/about03-1.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">{{ t('about.liquidity.second') }}</p>
          </div>
        </div>
        <div class="about-liquidity-block-3">
          <div class="bubble-block">
            <img src="@/assets/about/about03-2.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">{{ t('about.liquidity.third') }}</p>
          </div>
        </div>
        <img src="@/assets/about/about03-shadow-1.png" draggable="false" class="unselectable about-liquidity-shadow-1">
      </div>
      <div class="about-swap">
        <img src="@/assets/about/about04.png" draggable="false" class="unselectable">
        <div class="about-swap-title">
          <p class="gradient swap">{{ t('about.swap.title') }}</p>
        </div>
        <div class="about-swap-block-1">
          <p class="text">{{ t('about.swap.first') }}</p>
        </div>
        <div class="about-swap-block-2">
          <div class="bubble-block">
            <img src="@/assets/about/about04-1.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">{{ t('about.swap.second') }}</p>
          </div>
        </div>
        <div class="about-swap-block-3">
          <div class="bubble-block">
            <img src="@/assets/about/about04-2.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">{{ t('about.swap.third') }}</p>
          </div>
        </div>
        <img src="@/assets/about/about04-shadow-1.png" draggable="false" class="unselectable about-swap-shadow-1">
      </div>
      <div class="about-pswap">
        <img src="@/assets/about/about05.png" draggable="false" class="unselectable">
        <div class="about-pswap-title">
          <p class="gradient pswap">{{ t('about.pswap.title') }}</p>
        </div>
        <div class="about-pswap-block-1">
          <p class="text">{{ t('about.pswap.first') }}</p>
        </div>
        <div class="about-pswap-block-2">
          <div class="bubble-block">
            <img src="@/assets/about/about05-1.png" draggable="false" class="unselectable bubble-icon">
            <p class="text">{{ t('about.pswap.second') }}</p>
          </div>
        </div>
        <img src="@/assets/about/about05-shadow-1.png" draggable="false" class="unselectable about-pswap-shadow-1">
      </div>
      <div class="about-video">
        <img src="@/assets/about/about06.png" draggable="false" class="unselectable preview">
        <img src="@/assets/about/about06-shadow-1.png" draggable="false" class="unselectable about-video-shadow-1">
      </div>
      <div class="about-links">
        <div class="about-links-part">
          <img src="@/assets/about/about07-1.png" draggable="false" class="unselectable icon">
          <span class="title">{{ t('about.links.first.title') }}<img src="@/assets/about/about07-3.png" class="link"></span>
          <p class="text">{{ t('about.links.first.desc') }}</p>
          <a class="link-mask" href="https://sora.org/validator" target="_blank" />
        </div>
        <div class="about-links-part">
          <img src="@/assets/about/about07-2.png" draggable="false" class="unselectable icon">
          <span class="title">{{ t('about.links.second.title') }}<img src="@/assets/about/about07-3.png" class="link"></span>
          <p class="text">{{ t('about.links.second.desc') }}</p>
          <a class="link-mask" href="https://sora.org" target="_blank" />
        </div>
        <img src="@/assets/about/about07-shadow-1.png" draggable="false" class="unselectable about-links-shadow-1">
      </div>
      <div class="about-network">
        <img src="@/assets/about/about08.png" draggable="false" class="unselectable network-img">
        <p class="text">{{ t('about.network') }}</p>
      </div>
    </div>
    <footer class="app-footer">
      <div class="hr" />
      <div class="info-block">
        <div class="social-links">
          <a href="https://twitter.com/polkaswap" title="Twitter" target="_blank">
            <img src="@/assets/img/social/twitter.svg" class="link" />
          </a>
          <a href="https://t.me/polkaswap" title="Telegram" target="_blank">
            <img src="@/assets/img/social/telegram.svg" class="link" />
          </a>
          <a href="https://medium.com/@polkaswap" title="Medium" target="_blank">
            <img src="@/assets/img/social/medium.svg" class="link" />
          </a>
          <a href="https://reddit.com/r/polkaswap" title="Reddit" target="_blank">
            <img src="@/assets/img/social/reddit.svg" class="link" />
          </a>
          <a href="https://github.com/sora-xor" title="Github" target="_blank">
            <img src="@/assets/img/social/github.svg" class="link" />
          </a>
          <a href="https://sora.org" title="Sora" target="_blank">
            <img src="@/assets/img/social/sora.svg" class="link" />
          </a>
        </div>
        <div class="info-links">
          <a :href="t('helpDialog.termsOfServiceLink')" :title="t('footerMenu.memorandum')" target="_blank" class="text link">{{ t('footerMenu.memorandum') }}</a>
          <span class="divider">|</span>
          <a :href="t('helpDialog.privacyPolicyLink')" :title="t('footerMenu.privacy')" target="_blank" class="text link">{{ t('footerMenu.privacy') }}</a>
        </div>
      </div>
      <div class="app-disclaimer">
        <p>{{ t('disclaimer') }}</p>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class About extends Mixins(TranslationMixin) {
}
</script>

<style lang="scss" scoped>
$disclaimer-font-size: 11px;
$disclaimer-font-weight: 200;
$disclaimer-letter-spacing: -0.03em;

@mixin backgroundImageWidth {
  &>:first-child {
    width: 80%;
    min-width: 800px;
  }
}

.layout {
  max-width: 1040px;
  margin: 0 auto;
}

.content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.unselectable {
  user-drag: none;
  user-select: none;
}

.web3 {
  width: 100px;
  position: absolute;
  bottom: 0;
  right: 5%;
}

.bubble-block {
  display: flex;
  align-items: center;

  &>:first-child {
    max-width: 120px;
  }

  .bubble-icon {
    width: 30%;
  }
}

.about {
  margin: auto;
  &-main {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    .main {
      min-width: 800px;
      max-width: 1700px;
      width: 100%;
    }

    &-title {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -52%);
      line-height: 62px;
      text-align: center;
    }

    &-text {
      top: 60%;
      width: 35%;

      position: absolute;
      text-align: center;
    }
  }
  &-trading {
    min-width: 800px;
    padding-top: 5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-title {
      position: absolute;
      top: 20%;
      left: 68%;
      transform: translate(-50%, -50%);
      width: fit-content;
    }

    &-block-1 {
      top: 26%;
      right: 7.5%;
      width: 40%;

      position: absolute;
    }
    &-block-2 {
      top: 38%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-block-3 {
      top: 54%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-shadow-1 {
      position: absolute;
      top: -110%;
      z-index: -1;
      width: 100%;
    }
  }
  &-liquidity {
    min-width: 800px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-title {
      position: absolute;
      top: 36%;
      left: 32%;
      transform: translate(-50%, -50%);
      width: 40%;
    }

    &-block-1 {
      top: 56.5%;
      left: 30.5%;
      width: 37%;
      position: absolute;
      transform: translate(-50%, -50%);
    }
    &-block-2 {
      top: 75%;
      left: 36%;
      width: 55%;
      position: absolute;
      transform: translate(-50%, -50%);
    }
    &-block-3 {
      top: 94%;
      left: 36%;
      width: 55%;
      position: absolute;
      transform: translate(-50%, -50%);
    }
    &-shadow-1 {
      position: absolute;
      top: -110%;
      z-index: -1;
      width: 100%;
    }
  }
  &-swap {
    min-width: 800px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-title {
      position: absolute;
      top: 12%;
      left: 72%;
      transform: translate(-50%, -50%);
      width: 40%;
    }

    &-block-1 {
      top: 24%;
      right: 7.5%;
      width: 40%;

      position: absolute;
    }
    &-block-2 {
      top: 28%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-block-3 {
      top: 48%;
      right: 5.5%;
      width: 45%;

      position: absolute;
    }
    &-shadow-1 {
      position: absolute;
      top: -150%;
      z-index: -1;
      width: 100%;
    }
  }
  &-pswap {
    min-width: 800px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: column;
    position: relative;

    @include backgroundImageWidth;

    &-title {
      position: absolute;
      top: 29%;
      left: 54%;
      transform: translate(-50%, -50%);
      width: 40%;
    }

    &-block-1 {
      top: 36%;
      right: 33%;
      width: 33%;

      position: absolute;
    }
    &-block-2 {
      top: 62%;
      left: 32%;
      width: 50%;

      position: absolute;
    }
    &-shadow-1 {
      position: absolute;
      top: -70%;
      z-index: -1;
      width: 100%;
    }
  }
  &-video {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    .preview {
      width: 70%;
      cursor: pointer;
    }

    &-shadow-1 {
      position: absolute;
      top: -100%;
      z-index: -1;
      width: 120%;

      @media screen and (max-width: 1200px) {
        width: 100%;
      }
    }
  }
  &-links {
    width: 70%;
    max-width: 1600px;
    padding-top: 7rem;
    position: relative;

    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
    gap: 0px 5rem;
    grid-template-areas: ". .";
    &-part {
      display: flex;
      flex-direction: column;
      cursor: pointer;
      position: relative;

      &:after {
        content: '';
        margin-top: 20px;
        background: linear-gradient(80.38deg, #FFD9E5 14.49%, rgba(242, 153, 133, 0.68) 38.03%, rgba(239, 20, 92, 0.38) 61.35%, rgba(171, 24, 184, 0.25) 79.98%, rgba(24, 174, 184, 0.2) 85.51%);
        height: 1px;
      }

      .icon {
        width: 50px
      }
      .title {
        font-family: Sora;
        font-style: normal;
        font-weight: bold;
        font-size: 36px;
        line-height: 100%;

        letter-spacing: -0.02em;
        font-feature-settings: 'case' on, 'liga' off;

        padding: 10px 0;

        color: #D5CDD0;

        .link {
          width: 12px;
          margin-left: 5px;
          margin-bottom: 10px;
        }
      }
      .link-mask {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 100%;
      }
    }

    &-shadow-1 {
      position: absolute;
      top: 0;
      z-index: -1;
      width: 100%;
    }
  }
  &-network {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    padding-top: 5rem;
    padding-bottom: 5rem;

    .network-img {
      width: 65%;
    }

    .text {
      width: 55%;
      text-align: center;
    }
  }
}

.text {
  font-family: Sora;
  font-style: normal;
  font-weight: 200;
  font-size: 12px;
  line-height: 160%;

  letter-spacing: -0.02em;
  font-feature-settings: 'case' on, 'liga' off;

  color: #2A171F;
  @media screen and (min-width: 1100px) {
    font-size: 14px;
  }
}

.app-disclaimer {
  margin-top: $inner-spacing-mini * 2.5;
  margin-bottom: $inner-spacing-mini * 2.5;
  font-size: $disclaimer-font-size;
  font-weight: $disclaimer-font-weight;
  line-height: var(--s-line-height-mini);
  letter-spacing: $disclaimer-letter-spacing;
  color: var(--s-color-base-content-secondary);
}

.app-footer {
  display: flex;
  flex-direction: column;
  padding: 2rem 4rem;

  .hr {
    height: 1px;
    background: linear-gradient(80.38deg, #FFD9E5 14.49%, rgba(242, 153, 133, 0.68) 38.03%, rgba(239, 20, 92, 0.38) 61.35%, rgba(171, 24, 184, 0.25) 79.98%, rgba(24, 174, 184, 0.2) 85.51%);
  }
  .info-block {
    margin-top: 20px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    display: none;

    .social-links {
      display: flex;
      align-items: center;
      .link {
        padding: 0 5px;
      }
    }
    .info-links {
      display: flex;
      align-items: center;
      .divider {
        margin: 0 5px;
      }
      .link {
        font-weight: 200;
        font-size: 12px;
        line-height: 320%;
        text-align: right;
        letter-spacing: -0.02em;
        font-feature-settings: 'case' on;
      }
    }
  }
  .disclaimer {
    margin-top: 40px;
  }
}

.gradient {
  @mixin gradientBackground {
    background-clip: text;
    -webkit-background-clip: text;
  }

  @mixin fontSize {
    @media screen and (max-width: 1200px) {
      &.main {
        font-size: 55px;
      }
      &.trading, &.liquidity,
      &.swap, &.pswap {
        font-size: 36px;
      }
    }
  }

  font-family: Sora;
  font-style: normal;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-feature-settings: 'case' on, 'liga' off;
  box-decoration-break: clone;
  -webkit-text-fill-color: transparent;
  -webkit-box-decoration-break: clone;

  &.main {
    font-size: 58px;
    background: linear-gradient(79.7deg, rgba(242, 153, 133, 0.68) 5.55%, #FF3B7B 55.23%, rgba(24, 165, 184, 0.2) 98.71%, rgba(171, 24, 184, 0.25) 131.11%, rgba(242, 44, 109, 0.38) 157.31%);
    @include gradientBackground;
  }
  &.trading {
    font-size: 46px;
    background: linear-gradient(72.2deg, rgba(242, 44, 109, 0.38) 0%, #FF3B7B 32.74%, rgba(24, 165, 184, 0.2) 61.38%, rgba(171, 24, 184, 0.25) 82.74%, rgba(242, 153, 133, 0.68) 100%);
    @include gradientBackground;
  }
  &.liquidity {
    font-size: 46px;
    background: linear-gradient(80.38deg, #FFD9E5 14.49%, rgba(242, 153, 133, 0.68) 38.03%, rgba(239, 20, 92, 0.38) 61.35%, rgba(171, 24, 184, 0.25) 79.98%, rgba(24, 174, 184, 0.2) 85.51%);
    @include gradientBackground;
  }
  &.swap {
    font-size: 46px;
    background: linear-gradient(72.2deg, rgba(242, 44, 109, 0.38) 0%, #FF3B7B 32.74%, rgba(24, 165, 184, 0.2) 61.38%, rgba(171, 24, 184, 0.25) 82.74%, rgba(242, 153, 133, 0.68) 100%);
    @include gradientBackground;
  }
  &.pswap {
    font-size: 46px;
    background: linear-gradient(98.89deg, rgba(237, 20, 91, 0.75) 24.73%, rgba(86, 3, 48, 0.75) 71.56%, rgba(113, 24, 184, 0.75) 90.08%);
    @include gradientBackground;
  }

  @include fontSize;
}
</style>
