<script setup lang="ts">
import { computed, inject } from 'vue';

import { dropdownContextKey } from './dropdownContext';

defineOptions({
  name: 'SDropdownItem',
});

const props = withDefaults(
  defineProps<{
    value?: unknown;
    icon?: string | null;
    disabled?: boolean;
    divided?: boolean;
  }>(),
  {
    value: undefined,
    icon: null,
    disabled: false,
    divided: false,
  }
);

const emit = defineEmits<{
  (event: 'click', value: MouseEvent | KeyboardEvent): void;
}>();

const context = inject(dropdownContextKey, null);

const classes = computed(() => [
  'el-dropdown-menu__item',
  's-dropdown-menu__item',
  {
    'is-disabled': props.disabled,
    'is-divided': props.divided,
  },
]);

const handleSelect = (event: MouseEvent | KeyboardEvent): void => {
  if (props.disabled) return;
  emit('click', event);
  context?.onSelect(props.value, event);
};

const handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  handleSelect(event);
};
</script>

<template>
  <li :class="classes" role="menuitem" :tabindex="disabled ? -1 : 0" @click="handleSelect" @keydown="handleKeyDown">
    <s-icon v-if="icon" :name="icon" size="16" class="el-dropdown-menu__icon"></s-icon>
    <slot />
  </li>
</template>

<style lang="scss">
.s-dropdown-menu__item {
  display: flex;
  align-items: center;
  gap: $inner-spacing-mini;

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
  }

  &.is-divided {
    margin-top: $inner-spacing-mini;
    padding-top: $inner-spacing-small;
    border-top: 1px solid var(--s-color-base-border-secondary);
  }
}

.el-dropdown-menu__icon {
  flex-shrink: 0;
}
</style>
