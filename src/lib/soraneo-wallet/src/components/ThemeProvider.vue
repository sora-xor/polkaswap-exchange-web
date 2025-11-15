<template>
  <div class="sora-theme-provider" :data-theme="currentTheme">
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

import { Theme } from '@/consts';

const store = useStore();

const currentTheme = computed<Theme>(() => {
  const theme = store.getters['wallet/settings/libraryTheme'] as Theme | undefined;

  return theme ?? Theme.Light;
});
</script>

<style scoped>
.sora-theme-provider {
  display: contents;
}
</style>
