<template>
  <div class="layout about">
    <div class="content">
      <section class="description-section text-center">
        <div>
          <div>
            <h1>Advanced Digital Asset Routing</h1>
            <h3 style="line-height: 1.2; font-weight: 300">
              ADAR saves business owners of small and medium-sized businesses (SMBs) time and money by making it easy
              and cost effective to pay large numbers of global suppliers and employees on a recurring basis
            </h3>
          </div>
          <div class="description-section__ref">
            <a href="https://www.adar.com" target="_blank">learn more</a>
          </div>
          <img
            src="/adar/about/about1.png"
            alt="ADAR desktop app"
            class="description-section__picture"
            data-aos="fade-up"
            data-aos-delay="200"
            loading="lazy"
          />
        </div>
      </section>
    </div>
    <footer class="app-footer">
      <web-3-logo :theme="libraryTheme" draggable="false" class="web3 unselectable" />
      <div class="hr" />
    </footer>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import Web3Logo from '@/components/logo/Web3.vue';
import { app } from '@/consts';
import { getter } from '@/store/decorators';

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
  &::selection {
    background: red;
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

::selection {
  background: red;
  color: white;
}

.web3 {
  width: 150px;
  margin: 0 auto 60px;
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

  > * {
    width: 1200px;
    max-width: inherit;
  }

  .description-section {
    &__picture {
      width: 1000px;
      margin: 40px auto;
      border-radius: 12px;
      box-shadow: var(--s-shadow-element-pressed);
      pointer-events: none;
    }

    h1 {
      margin: 40px auto;
      font-weight: 700;
    }

    &__ref {
      @include flex-center;
      margin: 40px auto 0 auto;
      a {
        display: block;
        font-size: 20px;
        padding: 20px 40px;
        border-radius: 24px;
        background-color: var(--s-color-theme-accent);
        color: white;
        text-decoration: none;
        text-transform: capitalize;
        font-weight: 300;

        &:hover {
          background-color: var(--s-color-theme-accent-hover);
        }
      }
    }
  }
}

.app-footer {
  display: flex;
  flex-direction: column;
  padding: 0 22px 20px 20px;
}
</style>
