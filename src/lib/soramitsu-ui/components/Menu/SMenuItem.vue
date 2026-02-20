<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { useMenuContext } from './api';

defineOptions({
  name: 'SMenuItem',
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    index: string;
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  }
);

const emit = defineEmits<{
  (event: 'click', value: MouseEvent): void;
}>();

const attrs = useAttrs();
const menu = useMenuContext();

const isActive = computed(() => menu?.active?.value === props.index);

function handleClick(event: MouseEvent): void {
  emit('click', event);
  if (props.disabled) return;
  menu?.select(props.index);
}
</script>

<template>
  <li
    class="s-menu-item el-menu-item"
    :class="{ 'is-active': isActive, 'is-disabled': disabled }"
    :tabindex="disabled ? -1 : 0"
    role="menuitem"
    v-bind="attrs"
    @click="handleClick"
  >
    <slot />
  </li>
</template>

<style lang="scss">
.s-menu-item.el-menu-item {
  list-style: none;
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 10px;
  color: var(--s-menu-text-color);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;

  &.is-active {
    color: var(--s-menu-active-text-color);
  }

  &:hover:not(.is-disabled) {
    background-color: var(--s-menu-active-hover-color);
  }

  &.is-disabled {
    cursor: default;
    opacity: 0.6;
  }
}
</style>
