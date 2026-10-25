import { describe, expect, it, vi } from 'vitest';

import {
  getCellTooltipContent,
  getDefaultCellValue,
  isDefaultColumn,
  isDetailsColumn,
  isExpandColumn,
  isRecord,
  isSelectionColumn,
} from '@/lib/soramitsu-ui/components/Table/utils';

describe('table utils', () => {
  it('recognizes column types and plain object records', () => {
    expect(isDefaultColumn({ type: 'default' } as any)).toBe(true);
    expect(isSelectionColumn({ type: 'selection' } as any)).toBe(true);
    expect(isExpandColumn({ type: 'expand' } as any)).toBe(true);
    expect(isDetailsColumn({ type: 'details' } as any)).toBe(true);

    expect(isRecord({ prop: 'value' })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('not-an-object')).toBe(false);
  });

  it('reads nested default values and delegates to formatters when present', () => {
    const row = { asset: { symbol: 'XOR' }, amount: 12 };
    const formatter = vi.fn((_row, _column, value, index) => `${value}:${index}`);

    expect(
      getDefaultCellValue(
        row as any,
        {
          type: 'default',
          prop: 'asset.symbol',
          formatter: null,
        } as any,
        1
      )
    ).toBe('XOR');

    expect(
      getDefaultCellValue(
        row as any,
        {
          type: 'default',
          prop: 'amount',
          formatter,
        } as any,
        4
      )
    ).toBe('12:4');
    expect(formatter).toHaveBeenCalledWith(row, expect.objectContaining({ prop: 'amount' }), 12, 4);
  });

  it('returns tooltip content only for default columns that opt into overflow tooltips', () => {
    const row = { amount: 5 };

    expect(
      getCellTooltipContent(
        row as any,
        {
          type: 'selection',
          showOverflowTooltip: true,
        } as any
      )
    ).toBe('');

    expect(
      getCellTooltipContent(
        row as any,
        {
          type: 'default',
          prop: 'amount',
          showOverflowTooltip: false,
        } as any
      )
    ).toBe('');

    expect(
      getCellTooltipContent(
        row as any,
        {
          type: 'default',
          prop: 'amount',
          showOverflowTooltip: true,
        } as any
      )
    ).toBe('5');
  });
});
