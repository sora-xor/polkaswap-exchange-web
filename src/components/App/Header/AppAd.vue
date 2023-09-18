<template>
  <div v-if="adsArray.length" class="ad s-flex">
    <span class="ad-prev" @click="prev()">
      <s-icon name="arrows-chevron-left-rounded-24" />
    </span>
    <transition-group tag="div" class="ad-slider" :name="transitionName">
      <template v-for="(ad, index) in adsArray">
        <div v-if="currentIndex === index" :key="ad.title">
          <a
            class="ad-card"
            rel="nofollow noopener"
            :target="getTarget(ad.link)"
            :style="getStyles(ad)"
            :href="ad.link"
          >
            <span class="ad-text">
              {{ ad.title }}
              <s-icon class="ad-suffix" name="arrows-arrow-top-right-24" size="16px" />
            </span>
            <span class="ad-image" />
          </a>
        </div>
      </template>
    </transition-group>
    <span class="ad-next" @click="next()">
      <s-icon name="arrows-chevron-right-rounded-24" />
    </span>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { state } from '@/store/decorators';
import type { Ad } from '@/store/settings/types';

@Component
export default class AppAd extends Mixins(mixins.TranslationMixin) {
  @state.settings.adsArray adsArray!: Array<Ad>;

  private interval: Nullable<NodeJS.Timeout> = null;
  currentIndex = 0;
  transitionName = 'slide';

  mounted(): void {
    this.interval = setInterval(() => {
      this.next();
    }, 60_000);
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
    return { backgroundImage: `url(${ad.img})`, backgroundColor: ad.backgroundColor };
  }

  prev(): void {
    if (!this.adsArray.length) return;

    this.transitionName = 'slideback';
    if (this.currentIndex <= 0) {
      this.currentIndex = this.adsArray.length - 1; // last ad
    } else {
      this.currentIndex--;
    }
  }

  next(): void {
    if (!this.adsArray.length) return;

    this.transitionName = 'slide';
    if (this.currentIndex >= this.adsArray.length - 1) {
      this.currentIndex = 0; // first ad
    } else {
      this.currentIndex++;
    }
  }
}
</script>

<style lang="scss" scoped>
$ad-width: 280px;
$max-ad-width: 330px;
.ad {
  position: relative;
  width: $ad-width;
  &-prev,
  &-next {
    position: absolute;
    z-index: 1;
    cursor: pointer;
    > i {
      line-height: 1.75;
      color: var(--s-color-base-on-accent);
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
    padding-right: 24px;
    border-radius: var(--s-border-radius-medium);
    background-repeat: no-repeat;
    background-position: right 20px top;
    background-color: var(--s-color-theme-accent); // by default
    text-decoration: none;
    color: var(--s-color-base-on-accent);
  }
  &-text {
    flex: 3;
    align-self: center;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.36px;
    text-transform: uppercase;
  }
  &-suffix {
    color: var(--s-color-base-on-accent);
    font-weight: bold;
  }
  &-image {
    flex: 1;
  }
  @include desktop {
    width: $ad-width;
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
