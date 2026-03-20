<template>
  <div class="sora-theme-provider" :data-theme="currentTheme">
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

import { Theme } from '@/consts';
import { normalizeTheme } from '../store/settings/theme';

const store = useStore();

const currentTheme = computed<Theme>(() => {
  return normalizeTheme(store.getters['wallet/settings/libraryTheme']);
});
</script>

<style scoped>
.sora-theme-provider {
  display: contents;
}
</style>
