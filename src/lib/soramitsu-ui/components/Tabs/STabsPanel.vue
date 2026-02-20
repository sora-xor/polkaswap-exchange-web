<script setup lang="ts">
import { computed, provide, reactive } from 'vue';

import type { TabsPanelApi, TabsPanelBackgroundType } from './api';
import { TABS_PANEL_API_KEY } from './api';

defineOptions({
  name: 'STabs',
});

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    value?: string;
    type?: string;
    background?: TabsPanelBackgroundType;
  }>(),
  {
    modelValue: '',
    value: '',
    type: '',
    background: 'primary',
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'input', value: string): void;
}>();

const selectTab = (tab: string): void => {
  emit('update:modelValue', tab);
  emit('input', tab);
};

const active = computed(() => props.modelValue || props.value || '');

const background = computed(() => props.background);

const tabState: TabsPanelApi = reactive({
  active,
  selectTab,
  background,
});

provide(TABS_PANEL_API_KEY, tabState);
</script>
<template>
  <div
    role="tablist"
    class="s-tabs tabs-panel flex items-center justify-start"
    :class="`s-tabs_type_${type || 'default'}`"
  >
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
