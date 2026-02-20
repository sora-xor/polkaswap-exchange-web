<script setup lang="ts">
import { computed, provide, readonly, ref, watch } from 'vue';
import { MENU_CONTEXT_KEY } from './api';

defineOptions({ name: 'SMenu' });

const props = withDefaults(
  defineProps<{
    defaultActive?: string;
    mode?: 'vertical' | 'horizontal' | string;
    backgroundColor?: string;
    textColor?: string;
    activeTextColor?: string;
    activeHoverColor?: string;
    boxShadow?: string;
  }>(),
  {
    defaultActive: '',
    mode: 'vertical',
    backgroundColor: 'transparent',
    textColor: 'inherit',
    activeTextColor: 'inherit',
    activeHoverColor: 'transparent',
    boxShadow: 'none',
  }
);

const emit = defineEmits<{
  (event: 'select', value: string): void;
}>();

const active = ref(props.defaultActive);

watch(
  () => props.defaultActive,
  (value) => {
    active.value = value;
  }
);

function select(value: string): void {
  active.value = value;
  emit('select', value);
}

provide(
  MENU_CONTEXT_KEY,
  readonly({
    active,
    select,
  })
);

const menuStyles = computed(() => ({
  '--s-menu-background': props.backgroundColor,
  '--s-menu-text-color': props.textColor,
  '--s-menu-active-text-color': props.activeTextColor,
  '--s-menu-active-hover-color': props.activeHoverColor,
  '--s-menu-box-shadow': props.boxShadow,
}));
</script>

<template>
  <ul class="s-menu el-menu" :class="`s-menu--${mode}`" :style="menuStyles" role="menu">
    <slot />
  </ul>
</template>

<style lang="scss">
.s-menu.el-menu {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  background: var(--s-menu-background);
  color: var(--s-menu-text-color);
  box-shadow: var(--s-menu-box-shadow);
}

.s-menu.el-menu.s-menu--horizontal {
  display: flex;
  flex-flow: row nowrap;
  align-items: stretch;
}

.s-menu.el-menu.s-menu--vertical {
  display: flex;
  flex-flow: column nowrap;
}
</style>
