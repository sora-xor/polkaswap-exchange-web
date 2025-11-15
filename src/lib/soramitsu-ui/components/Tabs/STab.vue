<script setup lang="ts">
import type { TabsPanelApi } from './api';
import { useTabsPanelApi } from './api';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    name: string;
  }>(),
  {
    disabled: false,
  }
);

const state: TabsPanelApi = useTabsPanelApi();
const { active } = toRefs(state);
const { selectTab, background } = state;
const tabIsActive = computed(() => props.name === active.value);

const activateTab = () => {
  selectTab(props.name);
};

watch(
  () => props.disabled,
  (newVal) => {
    if (newVal && tabIsActive.value) {
      selectTab('');
    }
  }
);
</script>

<template>
  <button
    role="tab"
    class="s-tab flex justify-center items-center sora-tpg-p2"
    :disabled="disabled"
    :class="[{ 's-tab_active': tabIsActive }, `s-tab_background_${background}`]"
    @click="activateTab"
  >
    <div class="s-tab__label-container flex justify-center items-center">
      <div class="s-tab__label">
        <slot />
      </div>
    </div>
  </button>
</template>
