<template>
  <nav v-if="currentAd" class="marketing s-flex" :aria-label="t('ux.announcements.label')">
    <button
      v-if="hasMultipleAds"
      type="button"
      class="marketing-prev"
      :aria-label="t('ux.announcements.previous')"
      @click="move(-1)"
    >
      <s-icon name="arrows-chevron-left-rounded-24"></s-icon>
    </button>
    <a
      class="marketing-card"
      dir="ltr"
      rel="nofollow noopener"
      :target="isInternalHashHref(currentAd.link) ? '_self' : '_blank'"
      :href="normalizeHashHref(currentAd.link)"
    >
      <span class="marketing-text">{{ currentAd.title }}</span>
      <s-icon name="arrows-arrow-top-right-24" size="14px"></s-icon>
    </a>
    <button
      v-if="hasMultipleAds"
      type="button"
      class="marketing-next"
      :aria-label="t('ux.announcements.next')"
      @click="move(1)"
    >
      <s-icon name="arrows-chevron-right-rounded-24"></s-icon>
    </button>
  </nav>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { isInternalHashHref, normalizeHashHref } from '@/utils/hashHref';

import type { Ad } from '@/stores/settings/types';

/** Quiet, manually browsed announcements retain the configured destinations. */
const settingsStore = useSettingsStore();
const { t } = useTranslation();
const adsArray = computed(() => (Array.isArray(settingsStore.adsArray) ? (settingsStore.adsArray as Ad[]) : []));
const hasMultipleAds = computed(() => adsArray.value.length > 1);
const currentIndex = ref(0);
const currentAd = computed(() =>
  adsArray.value.length ? adsArray.value[currentIndex.value % adsArray.value.length] : undefined
);

/** Wrap navigation without timers or changes to configured links. */
function move(direction: number): void {
  const count = adsArray.value.length;
  if (!count) return;
  currentIndex.value = (currentIndex.value + direction + count) % count;
}
</script>

<style lang="scss" scoped>
.marketing {
  width: clamp(220px, 23vw, 330px);
  align-items: center;
  gap: 4px;
  color: var(--s-color-base-content-secondary);

  &-prev,
  &-next {
    flex: 0 0 32px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition:
      color 125ms ease,
      background-color 125ms ease;

    &:hover {
      color: var(--s-color-base-content-primary);
      background: var(--s-color-base-background);
    }
  }

  &-card {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    min-height: 36px;
    padding: 4px;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;

    &:hover {
      color: var(--s-color-base-content-primary);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  }

  &-text {
    font-size: 12px;
    line-height: 1.5;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
}
</style>
