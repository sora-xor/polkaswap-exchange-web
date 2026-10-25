import { describe, expect, it } from 'vitest';

import { parseStoredBoolean, parseStoredFiniteNumber, parseStoredJson } from '@/utils/storageParsing';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

describe('storage parsing', () => {
  it('parses strict persisted booleans without treating arbitrary JSON as truthy', () => {
    expect(parseStoredBoolean('true', false)).toBe(true);
    expect(parseStoredBoolean('false', true)).toBe(false);
    expect(parseStoredBoolean('"false"', true)).toBe(true);
    expect(parseStoredBoolean('{', false)).toBe(false);
    expect(parseStoredBoolean('{', null)).toBeNull();
  });

  it('parses only finite numbers accepted by the caller predicate', () => {
    const positive = (value: number) => value > 0;

    expect(parseStoredFiniteNumber('900000', 1, positive)).toBe(900000);
    expect(parseStoredFiniteNumber('-1', 900000, positive)).toBe(900000);
    expect(parseStoredFiniteNumber('Infinity', 7)).toBe(7);
    expect(parseStoredFiniteNumber('{', 7)).toBe(7);
  });

  it('falls back for malformed JSON and valid JSON with the wrong shape', () => {
    const fallback: string[] = [];

    expect(parseStoredJson('["xor","val"]', fallback, isStringArray)).toEqual(['xor', 'val']);
    expect(parseStoredJson('{', fallback, isStringArray)).toBe(fallback);
    expect(parseStoredJson('{}', fallback, isStringArray)).toBe(fallback);
    expect(parseStoredJson('null', fallback, isStringArray)).toBe(fallback);
    expect(fallback).toEqual([]);
  });
});
