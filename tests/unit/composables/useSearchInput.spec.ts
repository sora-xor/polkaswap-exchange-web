import { describe, expect, it, vi } from 'vitest';

import { useSearchInput } from '@/composables/useSearchInput';

import type { ComponentPublicInstance } from 'vue';

describe('useSearchInput', () => {
  it('normalises the search query', () => {
    const { query, searchQuery } = useSearchInput();

    query.value = '  Foo Bar  ';

    expect(searchQuery.value).toBe('foo bar');
  });

  it('clears the query and focuses the input', async () => {
    const { query, search, clearAndFocusSearch } = useSearchInput();
    const focus = vi.fn();

    query.value = 'value';
    search.value = { focus } as ComponentPublicInstance<{ focus: () => void }>;

    await clearAndFocusSearch();

    expect(query.value).toBe('');
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
