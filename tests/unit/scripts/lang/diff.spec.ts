import { describe, expect, it } from 'vitest';

import { diffLocales, flattenLocale } from '../../../../scripts/lang/diff';

describe('flattenLocale', () => {
  it('converts nested messages into dot notation', () => {
    const messages = {
      plain: 'value',
      nested: {
        child: 'child value',
      },
      array: ['first', 'second'],
      complex: {
        enabled: true,
        count: 2,
      },
    };

    expect(flattenLocale(messages)).toEqual({
      plain: 'value',
      'nested.child': 'child value',
      'array.0': 'first',
      'array.1': 'second',
      'complex.enabled': 'true',
      'complex.count': '2',
    });
  });
});

describe('diffLocales', () => {
  it('detects added, removed, and changed keys', () => {
    const base = {
      stable: 'value',
      removed: 'gone',
      nested: {
        keep: 'ok',
        change: 'before',
      },
    };

    const head = {
      stable: 'value',
      added: 'new entry',
      nested: {
        keep: 'ok',
        change: 'after',
      },
    };

    const diff = diffLocales(base, head);

    expect(diff).toContainEqual({
      key: 'added',
      change: 'added',
      after: 'new entry',
    });

    expect(diff).toContainEqual({
      key: 'removed',
      change: 'removed',
      before: 'gone',
    });

    expect(diff).toContainEqual({
      key: 'nested.change',
      change: 'changed',
      before: 'before',
      after: 'after',
    });

    expect(diff).toHaveLength(3);
  });
});
