import { describe, expect, it } from 'vitest';

import { usePaginationSearch } from '@/lib/soraneo-wallet/src/composables/usePaginationSearch';

describe('usePaginationSearch', () => {
  it('tracks paging indices, trims search text, and resets state helpers', () => {
    const pagination = usePaginationSearch();

    expect(pagination.currentPage.value).toBe(1);
    expect(pagination.pageAmount.value).toBe(10);
    expect(pagination.startIndex.value).toBe(0);
    expect(pagination.lastIndex.value).toBe(10);
    expect(pagination.lastPage.value).toBe(1);
    expect(pagination.directionShift.value).toBe(0);

    pagination.currentPage.value = 3;
    pagination.pageAmount.value = 5;
    pagination.query.value = '  xor  ';

    expect(pagination.startIndex.value).toBe(10);
    expect(pagination.lastIndex.value).toBe(15);
    expect(pagination.searchQuery.value).toBe('xor');

    pagination.resetPage();
    pagination.resetSearch();

    expect(pagination.currentPage.value).toBe(1);
    expect(pagination.query.value).toBe('');
  });

  it('sorts transactions and slices items using default and custom page bounds', () => {
    const pagination = usePaginationSearch();
    const transactions = [
      { id: 'late', startTime: 300 },
      { id: 'early', startTime: 100 },
      { id: 'middle', startTime: 200 },
      { id: 'missing' },
    ];

    expect(pagination.sortTransactions([...transactions]).map((item) => item.id)).toEqual([
      'early',
      'middle',
      'late',
      'missing',
    ]);
    expect(pagination.sortTransactions([...transactions], true).map((item) => item.id)).toEqual([
      'late',
      'middle',
      'early',
      'missing',
    ]);

    pagination.currentPage.value = 2;
    pagination.pageAmount.value = 2;

    expect(pagination.getPageItems(['a', 'b', 'c', 'd', 'e'])).toEqual(['c', 'd']);
    expect(pagination.getPageItems(['a', 'b', 'c', 'd', 'e'], 1, 4)).toEqual(['b', 'c', 'd']);
  });

  it('updates the current page through the pagination handlers', () => {
    const pagination = usePaginationSearch();

    pagination.handleNextClick(4);
    expect(pagination.currentPage.value).toBe(4);

    pagination.handlePrevClick(2);
    expect(pagination.currentPage.value).toBe(2);
  });
});
