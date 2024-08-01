<template>
  <div v-if="adsArray.length" class="marketing s-flex">
    <span v-button class="marketing-prev" @click="prev">
      <s-icon name="arrows-chevron-left-rounded-24" />
    </span>
    <transition-group tag="div" class="marketing-slider" :name="transitionName">
      <template v-for="(ad, index) in adsArray">
        <div v-if="currentIndex === index" :key="ad.title">
          <a
            class="marketing-card"
            rel="nofollow noopener"
            :target="getTarget(ad.link)"
            :style="getStyles(ad)"
            :href="ad.link"
          >
            <span class="marketing-text">
              {{ ad.title }}
              <s-icon class="marketing-suffix" name="arrows-arrow-top-right-24" size="16px" />
            </span>
            <span class="marketing-image" />
          </a>
        </div>
      </template>
    </transition-group>
    <span v-button class="marketing-next" @click="next">
      <s-icon name="arrows-chevron-right-rounded-24" />
    </span>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { state } from '@/store/decorators';
import type { Ad } from '@/store/settings/types';

import type { CSSProperties } from 'vue/types/jsx';

// PS. Do not call this component & css classes like ad/ads -> it'll be blocked by any blocker browser extension
@Component
export default class AppMarketing extends Mixins(mixins.TranslationMixin) {
  @state.settings.adsArray adsArray!: Array<Ad>;

  private interval: Nullable<NodeJS.Timeout> = null;
  currentIndex = 0;
  transitionName = 'slide';

  mounted(): void {
    this.interval = setInterval(this.next, 60_000);
  }

  beforeDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  getTarget(link: string) {
    if (link.startsWith('/#/')) {
      return '_self';
    }
    return '_blank';
  }

  getStyles(ad: Ad) {
    const styles: CSSProperties = { backgroundImage: `url(${ad.img})` };
    if (ad.backgroundColor) {
      styles.backgroundColor = ad.backgroundColor;
    }
    if (ad.right) {
      styles.backgroundPosition = `right ${ad.right} top`;
      styles.paddingRight = '24px';
    }
    return styles;
  }

  prev(): void {
    if (!this.adsArray.length) return;

    this.transitionName = 'slideback';
    if (this.currentIndex <= 0) {
      this.currentIndex = this.adsArray.length - 1; // last item
    } else {
      this.currentIndex--;
    }
  }

  next(): void {
    if (!this.adsArray.length) return;

    this.transitionName = 'slide';
    if (this.currentIndex >= this.adsArray.length - 1) {
      this.currentIndex = 0; // first item
    } else {
      this.currentIndex++;
    }
  }
}
</script>

<style lang="scss" scoped>
$ad-width: 280px;
$max-ad-width: 330px;
.marketing {
  position: relative;
  width: $ad-width;
  &-prev,
  &-next {
    position: absolute;
    z-index: 1;
    cursor: pointer;
    opacity: 0.3;
    > i {
      line-height: 1.75;
      color: var(--s-color-base-on-accent);
    }
    &:hover {
      opacity: 0.7;
    }
  }
  &-prev {
    left: 0;
  }
  &-next {
    right: 0;
  }
  &-slider {
    overflow: hidden;
    position: relative;
    height: var(--s-size-medium);
    width: 100%;
    border-radius: var(--s-border-radius-medium);
  }
  &-card {
    display: flex;
    position: absolute;
    height: var(--s-size-medium);
    width: 100%;
    padding-left: 24px;
    padding-right: 0;
    border-radius: var(--s-border-radius-medium);
    background-repeat: no-repeat;
    background-position: right top;
    background-size: contain;
    background-color: var(--s-color-theme-accent); // by default
    text-decoration: none;
    color: var(--s-color-base-on-accent);
  }
  &-text {
    flex: 4;
    align-self: center;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.36px;
    text-transform: uppercase;
    white-space: pre-line;
  }
  &-suffix {
    color: var(--s-color-base-on-accent);
    font-weight: bold;
  }
  &-image {
    flex: 1;
  }
  @media (minmax(1220px, false)) {
    width: $max-ad-width;
  }
}

.slide-leave-active,
.slide-enter-active {
  transition: 1s;
}
.slide-enter {
  transform: translate(100%, 0);
}
.slide-leave-to {
  transform: translate(-100%, 0);
}

.slideback-leave-active,
.slideback-enter-active {
  transition: 1s;
}
.slideback-enter {
  transform: translate(-100%, 0);
}
.slideback-leave-to {
  transform: translate(100%, 0);
}
</style>
