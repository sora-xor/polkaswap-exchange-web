<template>
  <div v-if="adsArray.length" class="marketing s-flex">
    <span v-if="hasMultipleAds" v-button class="marketing-prev" @click="prev">
      <s-icon name="arrows-chevron-left-rounded-24"></s-icon>
    </span>
    <transition-group tag="div" class="marketing-slider" :name="transitionName">
      <template v-for="(ad, index) in adsArray">
        <div v-if="currentIndex === index" :key="ad.title">
          <a
            class="marketing-card"
            rel="nofollow noopener"
            :target="getTarget(ad.link)"
            :style="getStyles(ad)"
            :href="getHref(ad.link)"
          >
            <span class="marketing-text">
              {{ ad.title }}
              <s-icon class="marketing-suffix" name="arrows-arrow-top-right-24" size="16px"></s-icon>
            </span>
            <span class="marketing-image"></span>
          </a>
        </div>
      </template>
    </transition-group>
    <span v-if="hasMultipleAds" v-button class="marketing-next" @click="next">
      <s-icon name="arrows-chevron-right-rounded-24"></s-icon>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

import store from '@/store';
import { useSettingsStore } from '@/stores/settings';
import { isInternalHashHref, normalizeHashHref } from '@/utils/hashHref';

import type { Ad } from '@/store/settings/types';

const settingsStore = useSettingsStore();
const adsArray = computed(() => {
  const ads = settingsStore.adsArray as Ad[] | undefined;
  if (Array.isArray(ads) && ads.length) {
    return ads;
  }

  const legacyAds = store.state?.settings?.adsArray as Ad[] | undefined;
  return Array.isArray(legacyAds) ? legacyAds : [];
});
const hasMultipleAds = computed(() => adsArray.value.length > 1);

const currentIndex = ref(0);
const transitionName = ref<'slide' | 'slideback'>('slide');
let interval: Nullable<NodeJS.Timeout> = null;

function getTarget(link: string): '_self' | '_blank' {
  return isInternalHashHref(link) ? '_self' : '_blank';
}

function getHref(link: string): string {
  return normalizeHashHref(link);
}

function getStyles(ad: Ad): Record<string, string> {
  const styles: Record<string, string> = { backgroundImage: `url(${ad.img})` };
  if (ad.backgroundColor) styles.backgroundColor = ad.backgroundColor;
  if (ad.right) {
    styles.backgroundPosition = `right ${ad.right} top`;
    styles.paddingRight = '24px';
  }
  return styles;
}

function prev(): void {
  if (!adsArray.value.length) return;
  transitionName.value = 'slideback';
  currentIndex.value = currentIndex.value <= 0 ? adsArray.value.length - 1 : currentIndex.value - 1;
}

function next(): void {
  if (!adsArray.value.length) return;
  transitionName.value = 'slide';
  currentIndex.value = currentIndex.value >= adsArray.value.length - 1 ? 0 : currentIndex.value + 1;
}

onMounted(() => {
  interval = setInterval(next, 60_000);
});

onBeforeUnmount(() => {
  if (interval) {
    clearInterval(interval);
  }
});
</script>

<style lang="scss" scoped>
$marketing-width: 280px;
$marketing-width-wide: 330px;

.marketing {
  position: relative;
  width: $marketing-width;

  &-prev,
  &-next {
    position: absolute;
    z-index: 1;
    cursor: pointer;
    opacity: 0.3;

    > i {
      line-height: 42px;
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
    position: relative;
    overflow: hidden;
    width: 100%;
    height: var(--s-size-medium);
    border-radius: var(--s-border-radius-medium);
  }

  &-card {
    position: absolute;
    display: flex;
    width: 100%;
    height: var(--s-size-medium);
    padding-right: 0;
    padding-left: 24px;
    border-radius: var(--s-border-radius-medium);
    background-color: var(--s-color-theme-accent);
    background-repeat: no-repeat;
    background-position: right top;
    background-size: contain;
    color: var(--s-color-base-on-accent);
    text-decoration: none;
  }

  &-text {
    flex: 4;
    align-self: center;
    color: var(--s-color-base-on-accent);
    white-space: pre-line;
    text-transform: uppercase;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.36px;
  }

  &-suffix {
    color: var(--s-color-base-on-accent);
    font-weight: bold;

    :deep(i.s-icon-arrows-arrow-top-right-24) {
      font-size: 16px !important;
      line-height: 16px !important;
    }
  }

  &-image {
    flex: 1;
  }

  @media (min-width: 1220px) {
    width: $marketing-width-wide;
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
