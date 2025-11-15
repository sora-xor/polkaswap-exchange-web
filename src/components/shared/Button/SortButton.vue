<template>
  <div v-button class="sort-button" @click="handleClick">
    <slot></slot>
    <s-icon name="arrows-chevron-top-rounded-24" :class="computedClasses"></s-icon>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { SortDirection } from '@soramitsu-ui/ui/types';

type SortData = {
  property: string;
  order: SortDirection | string;
};

type SortPayload = {
  property: string;
  order: SortDirection;
};

/**
 * Sort button that toggles sort order for a given column.
 */
const props = withDefaults(
  defineProps<{
    name?: string;
    sort?: SortData;
    defaultSort?: SortDirection;
  }>(),
  {
    name: '',
    sort: () =>
      ({
        property: '',
        order: SortDirection.DESC,
      }) as SortData,
    defaultSort: SortDirection.DESC,
  }
);

const emit = defineEmits<{
  (event: 'change-sort', payload: SortPayload): void;
}>();

const isActive = computed(() => props.name === props.sort.property);
const computedClasses = computed(() => {
  const base = 'sort-icon';
  return isActive.value ? [base, `${base}--active`, `${base}--${props.sort.order}`] : [base];
});

function toggleSort(): SortDirection {
  if (!isActive.value) {
    return props.defaultSort;
  }

  return props.sort.order === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC;
}

function handleClick(): void {
  emit('change-sort', {
    property: props.name,
    order: toggleSort(),
  });
}
</script>

<style lang="scss">
.sort-button {
  cursor: pointer;

  & > * {
    vertical-align: middle;

    &:not(:last-child) {
      margin-right: $inner-spacing-tiny;
    }
  }
}
.sort-icon {
  display: inline-flex;
  vertical-align: bottom;

  &--active {
    color: var(--s-color-theme-accent) !important;
  }

  &--descending {
    transform: rotate(180deg);
  }

  @include icon-styles($hoverColor: var(--s-color-theme-accent-hover));
}
</style>
