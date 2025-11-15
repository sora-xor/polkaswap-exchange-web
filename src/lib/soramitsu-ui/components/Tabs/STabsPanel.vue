<script setup lang="ts">
import type { TabsPanelApi, TabsPanelBackgroundType } from './api';
import { TABS_PANEL_API_KEY } from './api';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    background?: TabsPanelBackgroundType;
  }>(),
  {
    modelValue: '',
    background: 'primary',
  }
);

const emit = defineEmits(['update:modelValue']);

const selectTab = (tab: string): void => {
  emit('update:modelValue', tab);
};
const active = computed(() => props.modelValue);

const background = computed(() => props.background);

const tabState: TabsPanelApi = reactive({
  active,
  selectTab,
  background,
});

provide(TABS_PANEL_API_KEY, tabState);
</script>
<template>
  <div role="tablist" class="tabs-panel flex items-center justify-start">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
$tab-border-radius: 8px;
.tabs-panel {
  &:deep(*:first-child) {
    border-top-left-radius: $tab-border-radius;
    border-bottom-left-radius: $tab-border-radius;
  }
  &:deep(*:last-child) {
    border-top-right-radius: $tab-border-radius;
    border-bottom-right-radius: $tab-border-radius;
  }
}
</style>
