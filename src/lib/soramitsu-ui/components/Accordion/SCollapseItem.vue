<script setup lang="ts">
import { computed, inject } from 'vue';

import { collapseContextKey, type CollapseName } from './collapseContext';

defineOptions({
  name: 'SCollapseItem',
});

const props = withDefaults(
  defineProps<{
    name?: CollapseName;
    disabled?: boolean;
  }>(),
  {
    name: undefined,
    disabled: false,
  }
);

const fallbackName = `collapse-item-${Math.random().toString(36).slice(2)}`;

const context = inject(collapseContextKey, null);

const itemName = computed<CollapseName>(() => props.name ?? fallbackName);
const isActive = computed(() => context?.activeNames.value.includes(itemName.value) ?? false);

const handleToggle = (): void => {
  if (props.disabled) return;
  context?.toggleItem(itemName.value);
};

const resetCollapseStyles = (element: HTMLElement): void => {
  element.style.height = '';
  element.style.overflow = element.dataset.oldOverflow ?? '';
  element.style.paddingTop = element.dataset.oldPaddingTop ?? '';
  element.style.paddingBottom = element.dataset.oldPaddingBottom ?? '';
};

const handleBeforeEnter = (element: Element): void => {
  const target = element as HTMLElement;
  target.dataset.oldPaddingTop = target.style.paddingTop;
  target.dataset.oldPaddingBottom = target.style.paddingBottom;
  target.dataset.oldOverflow = target.style.overflow;
  target.style.height = '0';
  target.style.paddingTop = '0';
  target.style.paddingBottom = '0';
};

const handleEnter = (element: Element): void => {
  const target = element as HTMLElement;
  target.style.overflow = 'hidden';

  void target.offsetHeight;

  if (target.scrollHeight) {
    target.style.height = `${target.scrollHeight}px`;
  } else {
    target.style.height = '';
  }

  target.style.paddingTop = target.dataset.oldPaddingTop ?? '';
  target.style.paddingBottom = target.dataset.oldPaddingBottom ?? '';
};

const handleAfterEnter = (element: Element): void => {
  resetCollapseStyles(element as HTMLElement);
};

const handleBeforeLeave = (element: Element): void => {
  const target = element as HTMLElement;
  target.dataset.oldPaddingTop = target.style.paddingTop;
  target.dataset.oldPaddingBottom = target.style.paddingBottom;
  target.dataset.oldOverflow = target.style.overflow;
  target.style.height = `${target.scrollHeight}px`;
  target.style.overflow = 'hidden';
};

const handleLeave = (element: Element): void => {
  const target = element as HTMLElement;

  if (!target.scrollHeight) return;

  void target.offsetHeight;

  target.style.height = '0';
  target.style.paddingTop = '0';
  target.style.paddingBottom = '0';
};

const handleAfterLeave = (element: Element): void => {
  resetCollapseStyles(element as HTMLElement);
};
</script>

<template>
  <div class="el-collapse-item" :class="{ 'is-active': isActive, 'is-disabled': disabled }">
    <button class="el-collapse-item__header" type="button" :disabled="disabled" @click="handleToggle">
      <slot name="title" />
      <i class="el-collapse-item__arrow el-icon-arrow-right" :class="{ 'is-active': isActive }" aria-hidden="true"></i>
    </button>

    <transition
      @before-enter="handleBeforeEnter"
      @enter="handleEnter"
      @after-enter="handleAfterEnter"
      @before-leave="handleBeforeLeave"
      @leave="handleLeave"
      @after-leave="handleAfterLeave"
    >
      <div v-show="isActive" class="el-collapse-item__wrap collapse-transition">
        <div class="el-collapse-item__content">
          <slot />
        </div>
      </div>
    </transition>
  </div>
</template>

<style lang="scss">
.el-collapse-item {
  width: 100%;

  &__header {
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 0;
  }

  &__header:disabled {
    cursor: default;
  }

  &__wrap {
    overflow: hidden;
  }

  &__arrow {
    align-items: center;
    box-shadow: none;
    color: var(--s-color-base-content-tertiary);
    display: inline-flex;
    flex: 0 0 var(--s-icon-font-size-medium, 24px);
    font-size: var(--s-icon-font-size-mini, 16px);
    height: var(--s-icon-font-size-medium, 24px);
    justify-content: center;
    line-height: 1;
    width: var(--s-icon-font-size-medium, 24px);
    transition:
      color var(--s-transition-default),
      transform var(--s-transition-default);
    transform: rotate(0deg);
    // The legacy compatibility layer maps Element arrow pseudo-elements to
    // Soramitsu icon glyphs; keep the matching font here so collapse arrows
    // do not render as fallback boxes.
    font-family: var(--s-font-family-icons, soramitsu-icons);
    font-weight: 300;
  }

  &__arrow.is-active {
    transform: rotate(180deg);
  }

  &__header:hover &__arrow,
  &__header:focus-visible &__arrow {
    color: var(--s-color-base-content-primary);
  }
}

.collapse-transition {
  transition:
    height 0.3s ease-in-out,
    padding-top 0.3s ease-in-out,
    padding-bottom 0.3s ease-in-out;
}
</style>
