<template>
  <div class="layout about">
    <div class="content">
      <s-image
        :src="images.hero"
        lazy
        fit="cover"
        draggable="false"
        class="unselectable"
        style="max-width: 1040px; height: 585px"
      />
      <p class="gradient main" style="line-height: 1; margin-top: -60px; margin-bottom: 10px">{{ t('about.title') }}</p>
      <p class="text">{{ t('about.description') }}</p>
      <s-image
        :src="images.about02x"
        lazy
        fit="cover"
        draggable="false"
        class="unselectable"
        style="width: 75%; height: auto; margin-top: 120px; height: 343px"
      />
      <p class="gradient trading">{{ t('about.trading.title') }}</p>
      <p class="text" style="margin-top: 15px">
        {{ t('about.trading.first') }}
      </p>
      <s-image :src="images.about02_1" lazy fit="initial" draggable="false" class="unselectable bubble-icon" />
      <p class="text">{{ t('about.trading.second') }}</p>
      <s-image :src="images.about02_2" lazy fit="initial" draggable="false" class="unselectable bubble-icon" />
      <p class="text">
        {{ t('about.trading.third') }}
        <a
          href="https://en.wikipedia.org/wiki/BSD_licenses#4-clause_license_(original_%22BSD_License%22)"
          title="BSD 4-clause license"
          class="text"
          target="_blank"
          rel="nofollow noopener"
        >
          BSD 4-clause license
        </a>
      </p>
      <s-image
        :src="images.about03x"
        lazy
        fit="cover"
        draggable="false"
        class="unselectable"
        style="width: 75%; margin-top: 120px; height: 343px"
      />
      <p class="gradient liquidity">{{ t('about.liquidity.title') }}</p>
      <p class="text" style="margin-top: 15px">{{ t('about.liquidity.first') }}</p>
      <s-image :src="images.about03_1" lazy fit="initial" draggable="false" class="unselectable bubble-icon" />
      <p class="text">{{ t('about.liquidity.second') }}</p>
      <s-image :src="images.about03_2" lazy fit="initial" draggable="false" class="unselectable bubble-icon" />
      <p class="text">{{ t('about.liquidity.third') }}</p>

      <s-image
        :src="images.about04x"
        lazy
        fit="cover"
        draggable="false"
        class="unselectable"
        style="width: 75%; margin-top: 120px; height: 366px"
      />
      <p class="gradient swap">{{ t('about.swap.title') }}</p>
      <p class="text" style="margin-top: 15px">{{ t('about.swap.first') }}</p>
      <s-image :src="images.about04_1" lazy fit="initial" draggable="false" class="unselectable bubble-icon" />
      <p class="text">{{ t('about.swap.second') }}</p>
      <s-image :src="images.about04_2" lazy fit="initial" draggable="false" class="unselectable bubble-icon" />
      <p class="text">{{ t('about.swap.third') }}</p>

      <s-image
        :src="images.about05x"
        lazy
        fit="cover"
        draggable="false"
        class="unselectable"
        style="width: 75%; margin-top: 120px; height: 366px"
      />
      <p class="gradient pswap">{{ t('about.pswap.title') }}</p>
      <p class="text">{{ t('about.pswap.first') }}</p>
      <s-image :src="images.about05_1" lazy fit="initial" draggable="false" class="unselectable bubble-icon" />
      <p class="text" style="margin-bottom: 120px">
        {{ t('about.pswap.second', { percent: feePercent }) }}
      </p>

      <div class="about-video" style="margin-bottom: 120px">
        <a
          href="http://sora.org/pswap-soft-launch-video"
          target="_blank"
          rel="nofollow noopener"
          style="text-align: center"
        >
          <s-image
            :src="images.about06"
            lazy
            fit="cover"
            draggable="false"
            class="unselectable preview"
            style="width: 672px; height: 378px"
          />
        </a>
      </div>
      <div class="about-links" style="margin-bottom: 120px">
        <div class="about-links-part" style="text-align: left">
          <s-image
            :src="images.about07_1"
            lazy
            fit="fill"
            draggable="false"
            class="unselectable icon"
            style="height: 49px"
          />
          <span class="title">
            {{ t('about.links.first.title') }}
            <img :src="images.about07_3" class="link" />
          </span>
          <p class="text">{{ t('about.links.first.desc') }}</p>
          <a class="link-mask" href="https://sora.org/validator" target="_blank" rel="nofollow noopener" />
        </div>
        <div class="about-links-part" style="text-align: left">
          <s-image
            :src="images.about07_2"
            lazy
            fit="fill"
            draggable="false"
            class="unselectable icon"
            style="height: 49px"
          />
          <span class="title">
            {{ t('about.links.second.title') }}
            <img :src="images.about07_3" class="link" />
          </span>
          <p class="text">
            {{ t('about.links.second.desc') }}
          </p>
          <a class="link-mask" href="https://sora.org" target="_blank" rel="nofollow noopener" />
        </div>
      </div>
      <div class="about-network">
        <s-image :src="images.about08" lazy fit="fill" draggable="false" class="unselectable network-img" />
        <p class="text">
          {{ t('about.network') }}
        </p>
      </div>
    </div>
    <footer class="app-footer">
      <web-3-logo :theme="libraryTheme" draggable="false" class="web3 unselectable" />
      <div class="hr" />
    </footer>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import Web3Logo from '@/components/shared/Logo/Web3.vue';
import { getter } from '@/store/decorators';

import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

@Component({
  components: {
    Web3Logo,
  },
})
export default class About extends Mixins(TranslationMixin) {
  readonly IMAGES = [
    'about02-1.png',
    'about02-2.png',
    'about02x.png',
    'about03-1.png',
    'about03-2.png',
    'about03x.png',
    'about04-1.png',
    'about04-2.png',
    'about04x.png',
    'about05-1.png',
    'about06.png',
    'about05x.png',
    'about07-1.png',
    'about07-2.png',
    'about07-3.png',
    'about08.png',
    'hero.png',
  ].reduce((result: any, name) => {
    const key = name.split('.')[0].replace('-', '_');

    return {
      dark: { ...result.dark, [key]: `/about/${name === 'about06.png' ? 'shared' : 'dark'}/${name}` },
      light: { ...result.light, [key]: `/about/${name === 'about06.png' ? 'shared' : 'light'}/${name}` },
    };
  }, {});

  @getter.libraryTheme libraryTheme!: Theme;

  get images(): Record<string, string> {
    return this.IMAGES[this.libraryTheme];
  }

  get feePercent(): string {
    return new FPNumber('0.3').toLocaleString();
  }
}
</script>

<style lang="scss">
.about {
  .s-skeleton .el-skeleton {
    &.is-animated .el-skeleton__item {
      background: none;
      color: var(--s-color-base-content-tertiary);
    }
    &__image svg {
      fill: var(--s-color-base-content-tertiary);
      width: 100%;
    }
  }

  .bubble-icon {
    width: 150px;
    margin-top: calc(var(--s-basic-spacing) * 2);
    margin-bottom: calc(var(--s-basic-spacing) * -0.75);
  }

  a {
    outline: none;
    &:focus:not(:active) {
      @include focus-outline($inner: true);
    }
  }
}
</style>

<style lang="scss" scoped>
@mixin backgroundImageWidth {
  & > :first-child {
    width: 80%;
    min-width: 800px;
  }
}

.layout {
  margin: 0 auto;

  // temporary solution until lazy loading images
  &.loading {
    min-height: 100vh;
    overflow: hidden;
  }
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
}

.about {
  margin: -$inner-spacing-big auto 0;
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
      z-index: $app-background-layer;
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
  }
  &-video {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: relative;

    .preview {
      min-width: 70%;
      cursor: pointer;
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
    grid-template-areas: '. .';
    &-part {
      display: flex;
      flex-direction: column;
      cursor: pointer;
      position: relative;

      &:after {
        content: '';
        margin-top: 20px;
        background: linear-gradient(
          80.38deg,
          #ffd9e5 14.49%,
          rgba(242, 153, 133, 0.68) 38.03%,
          rgba(239, 20, 92, 0.38) 61.35%,
          rgba(171, 24, 184, 0.25) 79.98%,
          rgba(24, 174, 184, 0.2) 85.51%
        );
        height: 1px;
      }

      .icon {
        width: 50px;
      }
      .title {
        font-weight: bold;
        font-size: 36px;
        line-height: 100%;

        padding: 10px 0;

        color: #d5cdd0;

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
  font-weight: 200;
  font-size: var(--s-font-size-big);
  line-height: 1.4;
  z-index: $app-content-layer;

  color: var(--s-color-base-content-primary);
  @media screen and (min-width: 1400px) {
    font-size: 20px;
    line-height: 1.4;
  }
}

.content p {
  max-width: 640px;
}

.app-footer {
  display: flex;
  flex-direction: column;
  padding: 0 22px 20px 20px;

  .hr {
    height: 1px;
    background: linear-gradient(
      80.38deg,
      #ffd9e5 14.49%,
      rgba(242, 153, 133, 0.68) 38.03%,
      rgba(239, 20, 92, 0.38) 61.35%,
      rgba(171, 24, 184, 0.25) 79.98%,
      rgba(24, 174, 184, 0.2) 85.51%
    );
    max-width: 900px;
    min-width: 760px;
    width: 100%;
    margin: 0 auto;
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
      &.trading,
      &.liquidity,
      &.swap,
      &.pswap {
        font-size: 36px;
      }
    }
  }

  font-weight: 800;
  box-decoration-break: clone;
  -webkit-text-fill-color: transparent;
  -webkit-box-decoration-break: clone;

  &.main {
    font-size: 58px;
    background: linear-gradient(
      79.7deg,
      rgba(242, 153, 133, 0.68) 5.55%,
      #ff3b7b 55.23%,
      rgba(24, 165, 184, 0.2) 98.71%,
      rgba(171, 24, 184, 0.25) 131.11%,
      rgba(242, 44, 109, 0.38) 157.31%
    );
    @include gradientBackground;
  }
  &.trading {
    font-size: 46px;
    background: linear-gradient(
      72.2deg,
      rgba(242, 44, 109, 0.38) 0%,
      #ff3b7b 32.74%,
      rgba(24, 165, 184, 0.2) 61.38%,
      rgba(171, 24, 184, 0.25) 82.74%,
      rgba(242, 153, 133, 0.68) 100%
    );
    @include gradientBackground;
  }
  &.liquidity {
    font-size: 46px;
    background: linear-gradient(
      80.38deg,
      #ffd9e5 14.49%,
      rgba(242, 153, 133, 0.68) 38.03%,
      rgba(239, 20, 92, 0.38) 61.35%,
      rgba(171, 24, 184, 0.25) 79.98%,
      rgba(24, 174, 184, 0.2) 85.51%
    );
    @include gradientBackground;
  }
  &.swap {
    font-size: 46px;
    background: linear-gradient(
      72.2deg,
      rgba(242, 44, 109, 0.38) 0%,
      #ff3b7b 32.74%,
      rgba(24, 165, 184, 0.2) 61.38%,
      rgba(171, 24, 184, 0.25) 82.74%,
      rgba(242, 153, 133, 0.68) 100%
    );
    @include gradientBackground;
  }
  &.pswap {
    font-size: 46px;
    background: linear-gradient(
      98.89deg,
      rgba(237, 20, 91, 0.75) 24.73%,
      rgba(86, 3, 48, 0.75) 71.56%,
      rgba(113, 24, 184, 0.75) 90.08%
    );
    @include gradientBackground;
  }

  @include fontSize;
}
</style>
