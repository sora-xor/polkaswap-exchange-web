<script setup lang="ts">
import { computed, provide, ref, useAttrs } from 'vue';

import ElPopoverCompat from './ElPopoverCompat';
import { dropdownCompatContextKey } from './dropdownContext';

type DropdownTrigger = 'click' | 'hover' | 'focus' | 'manual';

defineOptions({
  name: 'SDropdown',
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    type?: string;
    icon?: string;
    trigger?: DropdownTrigger;
    placement?: string;
    popperClass?: string;
    hideOnClick?: boolean;
    disabled?: boolean;
    tabindex?: string | number;
    size?: string | number;
    buttonType?: string;
    borderRadius?: string;
    appendToBody?: boolean;
  }>(),
  {
    type: 'button',
    icon: '',
    trigger: 'click',
    placement: 'bottom-start',
    popperClass: '',
    hideOnClick: true,
    disabled: false,
    tabindex: undefined,
    size: 'small',
    buttonType: 'default',
    borderRadius: 'small',
    appendToBody: true,
  }
);

const emit = defineEmits<{
  (event: 'select', value: unknown): void;
  (event: 'visible-change', value: boolean): void;
}>();

const attrs = useAttrs();
const visible = ref(false);

const effectiveTrigger = computed<DropdownTrigger>(() => (props.disabled ? 'manual' : props.trigger));

const triggerClasses = computed(() => [
  'el-dropdown',
  's-dropdown',
  `s-dropdown--${props.type}`,
  `s-dropdown--${props.buttonType}`,
  {
    'is-disabled': props.disabled,
  },
]);

const popperClasses = computed(() => ['el-dropdown-menu', props.popperClass].filter(Boolean).join(' '));

const iconSize = computed(() => (typeof props.size === 'number' ? `${props.size}px` : undefined));

const triggerTabIndex = computed(() => (props.disabled ? -1 : (props.tabindex ?? 0)));
const triggerAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

function setVisible(next: boolean): void {
  visible.value = next;
  emit('visible-change', next);
}

function hide(): void {
  setVisible(false);
}

function show(): void {
  if (props.disabled) return;
  setVisible(true);
}

function toggle(): void {
  if (props.disabled) return;
  setVisible(!visible.value);
}

function handleItemSelect(value: unknown): void {
  emit('select', value);
  if (props.hideOnClick) {
    hide();
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  toggle();
}

const legacyDropdownRef = {
  handleClick: () => toggle(),
};

provide(dropdownCompatContextKey, {
  onSelect: (value) => handleItemSelect(value),
});

defineExpose({
  hide,
  show,
  toggle,
  $refs: {
    dropdown: legacyDropdownRef,
  },
});
</script>

<template>
  <ElPopoverCompat
    :visible="visible"
    :trigger="effectiveTrigger"
    :placement="placement"
    :popper-class="popperClasses"
    :visible-arrow="false"
    @update:visible="setVisible"
    @visible-change="setVisible"
  >
    <template #reference>
      <span
        v-bind="triggerAttrs"
        :class="[triggerClasses, attrs.class]"
        :style="attrs.style"
        :tabindex="triggerTabIndex"
        @keydown="handleKeyDown"
      >
        <slot>
          <s-icon v-if="icon" :name="icon" :size="iconSize || '16'" />
        </slot>
        <s-icon
          v-if="type === 'button'"
          class="s-dropdown__arrow"
          name="el-icon-arrow-down el-icon--right"
          :size="iconSize || '16'"
        />
      </span>
    </template>

    <ul class="el-dropdown-menu s-dropdown-menu" role="menu">
      <slot name="menu" />
    </ul>
  </ElPopoverCompat>
</template>

<style lang="scss">
.s-dropdown {
  display: inline-flex;
  align-items: center;
  gap: $inner-spacing-mini;
  cursor: pointer;
  color: var(--s-color-base-content-primary);

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
  }
}

.s-dropdown__arrow {
  color: var(--s-color-base-content-tertiary);
}

.s-dropdown-menu {
  list-style: none;
  margin: 0;
  padding: $inner-spacing-mini 0;
  min-width: 120px;
}
</style>
