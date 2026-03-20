<template>
  <div class="responsive-tabs" :class="{ 'responsive-tabs__dropdown': isMobile }">
    <s-dropdown
      v-if="isMobile"
      popper-class="responsive-tabs__dropdown-menu"
      type="button"
      placement="bottom-start"
      trigger="hover"
      :append-to-body="false"
      button-type="link"
      :size="size"
      @select="handleTabChange"
    >
      <h3 v-if="isHeader" class="responsive-tabs__dropdown-selected">
        {{ selectedName }}
      </h3>
      <template v-else>
        {{ selectedName }}
      </template>
      <template #menu>
        <s-dropdown-item
          v-for="{ name, label, icon } in tabs"
          class="responsive-tabs__dropdown-item"
          :class="{ selected: name === selectedKey }"
          :key="name"
          :value="name"
          :icon="icon"
          :disabled="disabled"
        >
          {{ label }}
        </s-dropdown-item>
      </template>
    </s-dropdown>
    <s-tabs
      v-else
      :class="['responsive-tabs__tabs', size]"
      type="rounded"
      :value="selectedKey"
      @update:model-value="handleTabChange"
    >
      <s-tab v-for="tab in tabs" :key="tab.name" :name="tab.name" :label="tab.label" :disabled="disabled"></s-tab>
    </s-tabs>
  </div>
</template>

<script lang="ts" setup>
import { computed, toRefs } from 'vue';

import { UiSize } from '@/consts/theme';
import type { ResponsiveTab } from '@/types/tabs';

const props = withDefaults(
  defineProps<{
    isHeader?: boolean;
    isMobile?: boolean;
    disabled?: boolean;
    size?: UiSize;
    tabs?: Array<ResponsiveTab>;
    modelValue?: string;
  }>(),
  {
    isHeader: false,
    isMobile: true,
    disabled: false,
    size: UiSize.MEDIUM,
    tabs: () => [],
    modelValue: undefined,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const selectedKeyModel = computed(() => props.modelValue ?? '');

const selected = computed(() => props.tabs.find((tab) => tab.name === selectedKeyModel.value));
const selectedName = computed(() => selected.value?.label ?? '');

function handleTabChange(name: string): void {
  emit('update:modelValue', name);
}

const selectedKey = computed(() => selectedKeyModel.value);

const { isMobile, isHeader, size, tabs, disabled } = toRefs(props);
</script>

<style lang="scss">
$icon-size: 22px;
// Dropdown menu styles
.el-dropdown-menu.el-popper.responsive-tabs {
  &__dropdown-menu {
    background-color: var(--s-color-utility-body);
    border-color: var(--s-color-base-border-secondary);
    .popper__arrow {
      display: none;
    }
    .responsive-tabs__dropdown-item {
      i {
        color: var(--s-color-base-content-tertiary);
        font-size: $icon-size;
      }
      &:not(.is-disabled):not(.selected) {
        &:hover,
        &:focus {
          &,
          & i {
            color: var(--s-color-base-content-secondary);
          }
        }
      }
      &.selected {
        &,
        & i {
          color: var(--s-color-theme-accent);
        }
      }
    }
  }
}
// Tabs styles
.responsive-tabs__tabs {
  .el-tabs__header {
    margin: 0;
  }

  &.s-tabs.s-rounded {
    .el-tabs__nav-wrap .el-tabs__item {
      &:not(.is-active).is-disabled {
        color: var(--s-color-base-content-primary);
      }
      &.is-disabled {
        cursor: not-allowed;
      }
    }

    &.small {
      .el-tabs__nav-wrap .el-tabs__item {
        padding: 0 $inner-spacing-mini;
        text-transform: initial;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.responsive-tabs {
  &__dropdown {
    &-selected {
      font-weight: 300;
      letter-spacing: var(--s-letter-spacing-mini);
    }
    &-item {
      line-height: 3;
      font-weight: 300;
      font-size: var(--s-font-size-small);
      color: var(--s-color-base-content-secondary);
      display: flex;
      align-items: center;
    }
  }
}
</style>
