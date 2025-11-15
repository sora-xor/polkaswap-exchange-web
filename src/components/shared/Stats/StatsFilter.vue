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
import { computed, onBeforeUnmount, ref, toRef, watchEffect } from 'vue';

import type { SnapshotFilter } from '@/types/filters';

defineOptions({ name: 'StatsFilter' });

const props = withDefaults(
  defineProps<{
    filters?: SnapshotFilter[];
    disabled?: boolean;
    value?: SnapshotFilter | null;
  }>(),
  {
    filters: () => [],
    disabled: false,
    value: null,
  }
);

const emit = defineEmits<{
  (event: 'update:value', value: Nullable<SnapshotFilter>): void;
  (event: 'input', value: Nullable<SnapshotFilter>): void;
}>();

const root = ref<HTMLElement | null>(null);
const visibility = ref(false);

const filterModel = computed<Nullable<SnapshotFilter>>({
  get: () => props.value ?? props.filters[0] ?? null,
  set: (value) => {
    emit('update:value', value);
    emit('input', value);
  },
});

const currentFilter = computed(() => filterModel.value);
const isDisabled = toRef(props, 'disabled');

const closeMenu = () => {
  visibility.value = false;
  removeListener();
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null;
  if (!target) return;
  const container = root.value;
  if (!container) return;
  if (!container.contains(target)) {
    closeMenu();
  }
};

const addListener = () => {
  const doc = root.value?.ownerDocument ?? document;
  doc.addEventListener('click', handleClickOutside);
};

const removeListener = () => {
  const doc = root.value?.ownerDocument ?? document;
  doc.removeEventListener('click', handleClickOutside);
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
    &-icon {
      margin-left: $inner-spacing-tiny;

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
    }
  }
}
</style>
