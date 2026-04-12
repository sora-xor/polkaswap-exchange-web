import { describe, expect, it } from 'vitest';

import booksSource from '@/views/Explore/Books.vue?raw';

describe('Books source', () => {
  it('renders whole-number book prices without a trailing decimal', () => {
    expect(booksSource).toContain(':integer-only="isAmountValueIntegerOnly(row.priceFormatted)"');
  });
});
