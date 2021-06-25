<template>
  <div class="layout" v-once>
    <div class="content">

      <img src="@/assets/about/hero.png" draggable="false" class="unselectable" style="max-width: 1040px;z-index: -1;" />
      <p class="gradient main" style="line-height:1;margin-top:-60px;margin-bottom:10px;">{{ t('about.title') }}</p>
      <p class="text">{{ t('about.description') }}</p>

      <img src="@/assets/about/about02x.png" draggable="false" class="unselectable" style="width:75%;height:auto;margin-top:120px;">
      <p class="gradient trading">{{ t('about.trading.title') }}</p>
      <p class="text" style="margin-top:15px;">{{ t('about.trading.first') }}</p>
      <img src="@/assets/about/about02-1.png" draggable="false" class="unselectable bubble-icon">
      <p class="text">{{ t('about.trading.second') }}</p>
      <img src="@/assets/about/about02-2.png" draggable="false" class="unselectable bubble-icon">
      <p class="text">{{ t('about.trading.third') }}
        <a href="https://en.wikipedia.org/wiki/BSD_licenses#4-clause_license_(original_%22BSD_License%22)" title="BSD 4-clause license" class="text" target="_blank" rel="nofollow noopener">BSD 4-clause license</a></p>
      <img src="@/assets/about/about03x.png" draggable="false" class="unselectable" style="width:75%;height:auto;margin-top:120px;">
      <p class="gradient liquidity">{{ t('about.liquidity.title') }}</p>
      <p class="text" style="margin-top:15px;">{{ t('about.liquidity.first') }}</p>
      <img src="@/assets/about/about03-1.png" draggable="false" class="unselectable bubble-icon">
      <p class="text">{{ t('about.liquidity.second') }}</p>
      <img src="@/assets/about/about03-2.png" draggable="false" class="unselectable bubble-icon">
      <p class="text">{{ t('about.liquidity.third') }}</p>

      <img src="@/assets/about/about04x.png" draggable="false" class="unselectable" style="width:75%;height:auto;margin-top:120px;">
      <p class="gradient swap">{{ t('about.swap.title') }}</p>
      <p class="text" style="margin-top:15px;">{{ t('about.swap.first') }}</p>
      <img src="@/assets/about/about04-1.png" draggable="false" class="unselectable bubble-icon">
      <p class="text">{{ t('about.swap.second') }}</p>
      <img src="@/assets/about/about04-2.png" draggable="false" class="unselectable bubble-icon">
      <p class="text">{{ t('about.swap.third') }}</p>

      <img src="@/assets/about/about05x.png" draggable="false" class="unselectable" style="width:75%;height:auto;margin-top:120px;">
      <p class="gradient pswap">{{ t('about.pswap.title') }}</p>
      <p class="text" >{{ t('about.pswap.first') }}</p>
      <img src="@/assets/about/about05-1.png" draggable="false" class="unselectable bubble-icon">
      <p class="text" style="margin-bottom:120px;">{{ t('about.pswap.second', { percent : feePercent }) }}</p>

      <div class="about-video" style="margin-bottom:120px;">
        <a href="http://sora.org/pswap-soft-launch-video" target="_blank" rel="nofollow noopener" style="text-align: center;">
          <img src="@/assets/about/about06.png" draggable="false" class="unselectable preview">
        </a>
        <img src="@/assets/about/about06-shadow-1.png" draggable="false" class="unselectable about-video-shadow-1">
      </div>
      <div class="about-links" style="margin-bottom:120px;">
        <div class="about-links-part" style="text-align:left;">
          <img src="@/assets/about/about07-1.png" draggable="false" class="unselectable icon">
          <span class="title">{{ t('about.links.first.title') }}<img src="@/assets/about/about07-3.png" class="link"></span>
          <p class="text">{{ t('about.links.first.desc') }}</p>
          <a class="link-mask" href="https://sora.org/validator" target="_blank" rel="nofollow noopener" />
        </div>
        <div class="about-links-part" style="text-align:left;">
          <img src="@/assets/about/about07-2.png" draggable="false" class="unselectable icon">
          <span class="title">{{ t('about.links.second.title') }}<img src="@/assets/about/about07-3.png" class="link"></span>
          <p class="text">{{ t('about.links.second.desc') }}</p>
          <a class="link-mask" href="https://sora.org" target="_blank" rel="nofollow noopener" />
        </div>
        <img src="@/assets/about/about07-shadow-1.png" draggable="false" class="unselectable about-links-shadow-1">
      </div>
      <div class="about-network">
        <img src="@/assets/about/about08.png" draggable="false" class="unselectable network-img">
        <p class="text">{{ t('about.network') }}</p>
      </div>
    </div>
    <footer class="app-footer">
      <img src="@/assets/about/web3.svg" draggable="false" class="web3 unselectable" />
      <div class="hr" />
      <div class="info-block">
        <div class="social-links">
          <a href="https://twitter.com/polkaswap" title="Twitter" target="_blank" rel="nofollow noopener">
            <img src="@/assets/img/social/twitter.svg" class="link" />
          </a>
          <a href="https://t.me/polkaswap" title="Telegram" target="_blank" rel="nofollow noopener">
            <img src="@/assets/img/social/telegram.svg" class="link" />
          </a>
          <a href="https://medium.com/@polkaswap" title="Medium" target="_blank" rel="nofollow noopener">
            <img src="@/assets/img/social/medium.svg" class="link" />
          </a>
          <a href="https://reddit.com/r/polkaswap" title="Reddit" target="_blank" rel="nofollow noopener">
            <img src="@/assets/img/social/reddit.svg" class="link" />
          </a>
          <a href="https://github.com/sora-xor" title="Github" target="_blank" rel="nofollow noopener">
            <img src="@/assets/img/social/github.svg" class="link" />
          </a>
          <a href="https://sora.org" title="Sora" target="_blank" rel="nofollow noopener">
            <img src="@/assets/img/social/sora.svg" class="link" />
          </a>
        </div>
        <div class="info-links">
          <a :href="t('helpDialog.termsOfServiceLink')" :title="t('footerMenu.memorandum')" target="_blank" rel="nofollow noopener" class="text link">{{ t('footerMenu.memorandum') }}</a>
          <span class="divider">|</span>
          <a :href="t('helpDialog.privacyPolicyLink')" :title="t('footerMenu.privacy')" target="_blank" rel="nofollow noopener" class="text link">{{ t('footerMenu.privacy') }}</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { FPNumber } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class About extends Mixins(TranslationMixin) {
  get feePercent (): string {
    return new FPNumber('0.3').toLocaleString()
  }
}
</script>

<style lang="scss" scoped>
@mixin backgroundImageWidth {
  &>:first-child {
    width: 80%;
    min-width: 800px;
  }
}

.layout {
  margin: 0 auto;
}

.content {
  display: flex;
  min-width: 800px;
  max-width: 1040px;
  margin: 0 auto;
  text-align: center;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.unselectable {
  user-drag: none;
  user-select: none;
}

.web3 {
  width: 150px;
  margin: 0 auto 60px;
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
  min-width: 800px;
  &-main {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    .main {
      min-width: 800px;
      max-width: 1405px;
      width: 100%;
      z-index: -1;
    }

    &-title {
      position: absolute;
      top: 50%;
      left: 48%;
      transform: translate(-50%, -52%);
      line-height: 48px;
      text-align: center;
    }

    &-text {
      top: 57%;
      margin-left: -60px;
      width: 36vw;
      min-width: 480px;
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
    max-width: 900px;
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
  font-size: 18px;
  line-height: 1.4;

  letter-spacing: -0.02em;

  color: #2A171F;
  @media screen and (min-width: 1400px) {
    font-size: 20px;
    line-height: 1.4;
  }
}

.content p { max-width: 640px;}
.content img.bubble-icon { margin: -60px; }

.app-footer {
  display: flex;
  flex-direction: column;
  padding: 0 0 0 20px;

  .hr {
    height: 1px;
    background: linear-gradient(80.38deg, #FFD9E5 14.49%, rgba(242, 153, 133, 0.68) 38.03%, rgba(239, 20, 92, 0.38) 61.35%, rgba(171, 24, 184, 0.25) 79.98%, rgba(24, 174, 184, 0.2) 85.51%);
    max-width: 900px;
    min-width: 760px;
    width: 100%;
    margin: 0 auto;
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
