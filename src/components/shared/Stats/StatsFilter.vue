<template>
  <div ref="root" class="stats-filter">
    <s-button type="link" size="small" class="stats-filter-button" :disabled="disabled" @click="toggleMenu">
      {{ currentFilter?.label }}
      <s-icon
        name="el-icon-arrow-down"
        size="12px"
        :class="['stats-filter-button-icon', { opened: visibility }]"
      ></s-icon>
    </s-button>
    <div v-show="visibility" class="stats-filter-menu stats-filter-list">
      <s-button
        v-for="{ name, label } in filters"
        :key="name"
        type="link"
        size="small"
        :class="['stats-filter-list-item', { 's-pressed': name === currentFilter?.name }]"
        @click="setValue(name)"
      >
        {{ label }}
      </s-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, toRef, watchEffect } from 'vue';

import type { SnapshotFilter } from '@/types/filters';

defineOptions({ name: 'StatsFilter' });

const props = withDefaults(
  defineProps<{
    filters?: SnapshotFilter[];
    disabled?: boolean;
    modelValue?: SnapshotFilter | null;
  }>(),
  {
    filters: () => [],
    disabled: false,
    modelValue: undefined,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: Nullable<SnapshotFilter>): void;
}>();

const root = ref<HTMLElement | null>(null);
const visibility = ref(false);

const selectedFilter = computed<Nullable<SnapshotFilter>>(() => props.modelValue ?? props.filters[0] ?? null);

const filterModel = computed<Nullable<SnapshotFilter>>({
  get: () => selectedFilter.value,
  set: (value) => {
    emit('update:modelValue', value);
  },
});

const currentFilter = computed(() => filterModel.value);
const isDisabled = toRef(props, 'disabled');

const closeMenu = () => {
  visibility.value = false;
  removeListener();
};

const handleViewportOrNavigationChange = () => {
  if (!visibility.value) return;
  closeMenu();
};

const handleClickOutside = (event: Event) => {
  const target = event.target as Node | null;
  if (!target) return;
  const container = root.value;
  if (!container) return;
  if (!container.contains(target)) {
    closeMenu();
  }
};

const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;

const addListener = () => {
  const doc = root.value?.ownerDocument ?? document;
  if (supportsPointerEvents) {
    doc.addEventListener('pointerdown', handleClickOutside);
  } else {
    doc.addEventListener('click', handleClickOutside);
    doc.addEventListener('touchstart', handleClickOutside);
  }
};

const removeListener = () => {
  const doc = root.value?.ownerDocument ?? document;
  if (supportsPointerEvents) {
    doc.removeEventListener('pointerdown', handleClickOutside);
  } else {
    doc.removeEventListener('click', handleClickOutside);
    doc.removeEventListener('touchstart', handleClickOutside);
  }
};

watchEffect(
  () => {
    if (isDisabled.value && visibility.value) {
      closeMenu();
    }
  },
  { flush: 'post' }
);

onBeforeUnmount(() => {
  removeListener();
  window.removeEventListener('resize', handleViewportOrNavigationChange);
  window.removeEventListener('hashchange', handleViewportOrNavigationChange);
  window.removeEventListener('popstate', handleViewportOrNavigationChange);
});

onMounted(() => {
  window.addEventListener('resize', handleViewportOrNavigationChange);
  window.addEventListener('hashchange', handleViewportOrNavigationChange);
  window.addEventListener('popstate', handleViewportOrNavigationChange);
});

const toggleMenu = () => {
  if (props.disabled) return;
  visibility.value = !visibility.value;
  if (visibility.value) {
    addListener();
  } else {
    removeListener();
  }
};

const setValue = (name: string) => {
  const nextFilter = props.filters.find((item) => item.name === name);
  if (!nextFilter) return;
  filterModel.value = nextFilter;
  closeMenu();
};

defineExpose({
  visibility,
  closeMenu,
  toggleMenu,
});
</script>

<style lang="scss" scoped>
$gap: $inner-spacing-mini;

.stats-filter {
  position: relative;

  &-button {
    color: var(--s-color-base-content-secondary) !important;
    font-weight: 500;
    line-height: 12px;
    padding: 4px 6px !important;

    :deep(.s-button__text) {
      color: var(--s-color-base-content-secondary);
      font-weight: 500;
      line-height: 12px;
    }

    &-icon {
      margin-left: $inner-spacing-tiny;
      width: 12px;
      height: 12px;
      font-size: 12px;
      line-height: 12px;
      color: inherit;

      &.opened {
        transform: rotate(180deg);
      }
    }
  }

  &-menu {
    position: absolute;
    z-index: 10;
    top: 100%;
    left: 100%;
    transform: translate(-100%, 10px);
  }

  &-list {
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-dialog);
    border-radius: $inner-spacing-small;
    width: 240px;
    padding: $gap;
    display: flex;
    flex-flow: row wrap;
    gap: $gap;

    &-item {
      @include columns(3, $gap);
      color: var(--s-color-base-content-primary) !important;

      :deep(.s-button__text) {
        color: inherit;
      }

      &.s-pressed {
        color: var(--s-color-theme-accent) !important;
      }
    }
  }
}

:global(:root[data-theme='dark'] .stats-filter-button),
:global(:root[design-system-theme='dark'] .stats-filter-button),
:global(.sora-theme-provider[data-theme='dark'] .stats-filter-button),
:global(.sora-theme-provider[design-system-theme='dark'] .stats-filter-button) {
  color: var(--s-color-base-content-primary) !important;
}

:global(:root[data-theme='dark'] .stats-filter-button .s-button__text),
:global(:root[design-system-theme='dark'] .stats-filter-button .s-button__text),
:global(.sora-theme-provider[data-theme='dark'] .stats-filter-button .s-button__text),
:global(.sora-theme-provider[design-system-theme='dark'] .stats-filter-button .s-button__text) {
  color: var(--s-color-base-content-primary) !important;
}
</style>
