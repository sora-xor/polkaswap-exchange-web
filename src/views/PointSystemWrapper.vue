<template>
  <component :is="componentToRender"></component>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';

import { useSettingsStore } from '@/stores/settings';

const PointSystemComponent = defineAsyncComponent(() => import('@/views/PointSystem.vue'));
const PointSystemV2Component = defineAsyncComponent(() => import('@/views/PointSystemV2.vue'));

const settingsStore = useSettingsStore();

/**
 * Picks the point system variant according to the feature flag.
 */
const componentToRender = computed(() => (settingsStore.pointSystemV2 ? PointSystemV2Component : PointSystemComponent));

defineExpose({
  // Exposed for unit tests to assert which loader is active without instantiating the async component.
  componentToRender,
  legacyLoader: PointSystemComponent,
  v2Loader: PointSystemV2Component,
});
</script>
