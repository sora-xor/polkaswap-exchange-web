import { nextTick, onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

import type { FnWithoutArgs, Nullable } from '@/types/common';

type UseScrollableTableOptions = {
  tableItems: MaybeRefOrGetter<readonly unknown[]>;
};

/**
 * Provides scroll-synchronisation between the header and body of Sora tables.
 * Mirrors the behaviour of `ScrollableTableMixin` without relying on class components.
 */
export function useScrollableTable(options: UseScrollableTableOptions) {
  const tableRef = ref<any>(null);
  const teardownScrollSync = ref<Nullable<FnWithoutArgs>>(null);

  const resetScrollbarSync = () => {
    teardownScrollSync.value?.();
    teardownScrollSync.value = null;
  };

  const initScrollbarSync = () => {
    resetScrollbarSync();

    const tableComponent = tableRef.value;
    const elTable = tableComponent?.$refs?.table;
    const bodyWrapper = elTable?.$refs?.bodyWrapper as HTMLElement | undefined;
    const headerWrapper = elTable?.$refs?.headerWrapper as HTMLElement | undefined;

    if (!bodyWrapper || !headerWrapper) return;

    const syncScroll = () => {
      const scrollLeft = bodyWrapper.scrollLeft;
      headerWrapper.scrollLeft = scrollLeft;
      elTable.scrollPosition = scrollLeft === 0 ? 'left' : 'right';
    };

    bodyWrapper.addEventListener('scroll', syncScroll, { passive: true });
    syncScroll();

    teardownScrollSync.value = () => {
      bodyWrapper.removeEventListener('scroll', syncScroll);
    };
  };

  const refreshScrollbarSync = () => {
    nextTick().then(() => initScrollbarSync());
  };

  onMounted(refreshScrollbarSync);
  watch(
    () => toValue(options.tableItems),
    () => refreshScrollbarSync()
  );

  onBeforeUnmount(() => resetScrollbarSync());

  return {
    tableRef: tableRef as Ref<any>,
    initScrollbarSync,
  };
}

export type ScrollableTableComposable = ReturnType<typeof useScrollableTable>;
