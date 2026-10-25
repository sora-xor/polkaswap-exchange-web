import { describe, expect, it } from 'vitest';

import {
  resolveOrderTableScrollElements,
  type OrderTableComponentRef,
} from '@/features/misc/components/order-book/table';

describe('order-book table helpers', () => {
  it('resolves scroll wrappers only when both table refs are HTMLElements', () => {
    const bodyWrapper = document.createElement('div');
    const headerWrapper = document.createElement('div');
    const table = {
      $refs: {
        bodyWrapper,
        headerWrapper,
      },
    } satisfies OrderTableComponentRef;

    expect(resolveOrderTableScrollElements(table)).toEqual({
      bodyWrapper,
      headerWrapper,
    });
    expect(resolveOrderTableScrollElements(null)).toBeNull();
    expect(resolveOrderTableScrollElements({ $refs: { bodyWrapper } })).toBeNull();
    expect(
      resolveOrderTableScrollElements({ $refs: { bodyWrapper: 'not-an-element' } } as unknown as OrderTableComponentRef)
    ).toBeNull();
  });
});
