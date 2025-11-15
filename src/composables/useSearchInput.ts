import { computed, nextTick, ref } from 'vue';

import type { ComponentPublicInstance } from 'vue';

/**
 * Provides shared helpers for search inputs that need two-way binding,
 * trimming, and autofocus/focus-reset behaviour.
 */
export function useSearchInput() {
  const search = ref<ComponentPublicInstance<{ focus: FnWithoutArgs }>>();
  const query = ref('');

  const searchQuery = computed(() => query.value.trim().toLowerCase());

  const handleClearSearch = () => {
    query.value = '';
  };

  const focusSearchInput = async () => {
    await nextTick();
    search.value?.focus?.();
  };

  const clearAndFocusSearch = async () => {
    handleClearSearch();
    await focusSearchInput();
  };

  return {
    search,
    query,
    searchQuery,
    handleClearSearch,
    focusSearchInput,
    clearAndFocusSearch,
  };
}

export type SearchInputComposable = ReturnType<typeof useSearchInput>;
