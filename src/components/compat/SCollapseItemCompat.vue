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
</script>

<template>
  <div class="el-collapse-item" :class="{ 'is-active': isActive, 'is-disabled': disabled }">
    <button class="el-collapse-item__header" type="button" :disabled="disabled" @click="handleToggle">
      <slot name="title" />
      <i class="el-collapse-item__arrow el-icon-arrow-right" :class="{ 'is-active': isActive }" aria-hidden="true"></i>
    </button>

    <transition name="el-collapse-transition">
      <div v-show="isActive" class="el-collapse-item__wrap">
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
    transition: transform var(--s-transition-default);
    transform: rotate(0deg);
    font-family: element-icons;
    font-weight: 300;
    box-shadow:
      #fff -5px -5px 10px 0,
      rgba(0, 0, 0, 0.1) 1px 1px 10px 0,
      rgba(255, 255, 255, 0.8) 1px 1px 2px 0 inset;
  }

  &__arrow.is-active {
    transform: rotate(90deg);
  }
}

.el-collapse-transition-enter-active,
.el-collapse-transition-leave-active {
  transition: opacity var(--s-transition-default);
}

.el-collapse-transition-enter-from,
.el-collapse-transition-leave-to {
  opacity: 0;
}
</style>
