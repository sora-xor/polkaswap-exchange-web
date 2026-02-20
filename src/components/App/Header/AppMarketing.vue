<template>
  <div v-if="adsArray.length" class="marketing s-flex">
    <span v-button class="marketing-prev" @click="prev">
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
    <span v-button class="marketing-next" @click="next">
      <s-icon name="arrows-chevron-right-rounded-24"></s-icon>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import store from '@/store';
import { isInternalHashHref, normalizeHashHref } from '@/utils/hashHref';

import type { Ad } from '@/store/settings/types';

const { t } = useTranslation();
const adsArray = computed(() => {
  const ads = store.state.settings.adsArray as Ad[] | undefined;
  return Array.isArray(ads) ? ads : [];
});

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
