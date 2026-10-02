import { describe, expect, it } from 'vitest';

import { isJsonRecord, parseIndexerJson } from '@/utils/indexerParsing';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

describe('indexer JSON parsing', () => {
  it('returns parsed JSON only when it passes the requested shape guard', () => {
    expect(parseIndexerJson('["xor","val"]', [], isStringArray)).toEqual(['xor', 'val']);
  });

  it.each([undefined, null, '', 'not-json', '{}', '["xor", 1]'])(
    'returns the documented fallback for missing, malformed, or wrong-shape payload %j',
    (payload) => {
      const fallback = ['fallback'];

      expect(parseIndexerJson(payload, fallback, isStringArray)).toBe(fallback);
    }
  );

  it('recognizes JSON records without accepting arrays or null', () => {
    expect(isJsonRecord({ id: 'xor' })).toBe(true);
    expect(isJsonRecord([])).toBe(false);
    expect(isJsonRecord(null)).toBe(false);
  });
});
