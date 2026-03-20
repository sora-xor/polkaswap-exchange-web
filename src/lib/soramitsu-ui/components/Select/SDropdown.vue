<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, provide, ref, useAttrs, useSlots } from 'vue';

import SSelectBase from './SSelectBase.vue';
import SSelectButton from './SSelectButton.vue';
import SSelectDropdown from './SSelectDropdown.vue';
import type { SelectApi } from './api';
import type { SelectOption, SelectSize, SelectOptionGroup } from './types';
import { SelectButtonType, SelectOptionType } from './types';
import SPopoverPanel from '../Popover/SPopoverPanel';

import { dropdownContextKey } from './dropdownContext';

type DropdownTrigger = 'click' | 'hover' | 'focus' | 'manual';

defineOptions({
  name: 'SDropdown',
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    modelValue?: any;
    options?: SelectOption[] | SelectOptionGroup[];
    optionType?: SelectOptionType;
    disabled?: boolean;
    multiple?: boolean;
    label?: string;
    size?: SelectSize;
    inline?: boolean;
    noAutoClose?: boolean;
    loading?: boolean;
    dropdownSearch?: boolean;
    remoteSearch?: boolean;
    maxShownOptions?: string | number | undefined;
    mandatory?: boolean;
    type?: string;
    icon?: string;
    trigger?: DropdownTrigger;
    placement?: string;
    popperClass?: string;
    hideOnClick?: boolean;
    tabindex?: string | number;
    buttonType?: string;
    borderRadius?: string;
    appendToBody?: boolean;
  }>(),
  {
    hideOnClick: true,
  }
);

const buttonType = computed(() => (props.inline ? SelectButtonType.Inline : SelectButtonType.Default));
const attrs = useAttrs();
const slots = useSlots();
const emit = getCurrentInstance()?.emit;
const visible = ref(false);

defineSlots<{
  label?: (api: SelectApi<any>) => any;
  empty?: () => any;
  default?: () => any;
  menu?: () => any;
}>();

const isMenuDropdown = computed(() => Boolean(slots.menu));
const effectiveTrigger = computed<DropdownTrigger>(() => (props.disabled ? 'manual' : (props.trigger ?? 'click')));
const menuButtonType = computed(() => props.buttonType ?? 'default');
const popperClasses = computed(() => ['el-dropdown-menu', props.popperClass].filter(Boolean).join(' '));
const iconSize = computed(() => (typeof props.size === 'number' ? `${props.size}px` : undefined));
const triggerTabIndex = computed(() => (props.disabled ? -1 : (props.tabindex ?? 0)));
const triggerClasses = computed(() => [
  'el-dropdown',
  's-dropdown',
  `s-dropdown--${props.type ?? 'button'}`,
  `s-dropdown--${menuButtonType.value}`,
  {
    'is-disabled': props.disabled,
  },
]);
const triggerAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const legacyDropdownRef = {
  handleClick: () => toggle(),
};

function isThereLabelSlot() {
  return Boolean(slots.label);
}

function setVisible(next: boolean): void {
  visible.value = next;
  emit?.('update:show', next);
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

function handleWindowResize(): void {
  if (!isMenuDropdown.value || !visible.value) return;
  hide();
}

function handleItemSelect(value: unknown): void {
  emit?.('select', value);
  if (props.hideOnClick ?? true) {
    hide();
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  toggle();
}

provide(dropdownContextKey, {
  onSelect: (value) => handleItemSelect(value),
});

onMounted(() => {
  window.addEventListener('resize', handleWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
});

defineExpose({
  visible,
  hide,
  show,
  toggle,
  $refs: {
    dropdown: legacyDropdownRef,
  },
});
</script>

<template>
  <SPopoverPanel
    v-if="isMenuDropdown"
    :show="visible"
    :trigger="effectiveTrigger"
    :placement="placement ?? 'bottom-start'"
    :popper-class="popperClasses"
    :visible-arrow="false"
    @update:show="setVisible"
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
          v-if="(type ?? 'button') === 'button'"
          class="s-dropdown__arrow"
          name="el-icon-arrow-down el-icon--right"
          :size="iconSize || '16'"
        />
      </span>
    </template>

    <ul class="el-dropdown-menu s-dropdown-menu" role="menu">
      <slot name="menu" />
    </ul>
  </SPopoverPanel>

  <SSelectBase v-else v-bind="{ ...attrs, ...$props } as any" :same-width-popper="loading">
    <template #control>
      <SSelectButton data-testid="select-trigger" :type="buttonType">
        <template v-if="isThereLabelSlot() || label" #label="binding">
          <slot name="label" v-bind="binding">
            {{ label }}
          </slot>
        </template>
      </SSelectButton>
    </template>

    <template #dropdown="{ search }">
      <SSelectDropdown
        :search="search"
        :item-type="optionType ?? SelectOptionType.Default"
        :max-shown-options="+(maxShownOptions ?? 0)"
      >
        <template #empty>
          <slot name="empty" />
        </template>
      </SSelectDropdown>
    </template>
  </SSelectBase>
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
