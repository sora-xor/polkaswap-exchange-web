import { test, expect } from 'vitest';

import * as akkMain from '../../src/lang/akk.json';
import * as akkCard from '../../src/lang/card/akk.json';

const getDefault = (mod: Record<string, any>) => (mod as any).default ?? mod;

function flatten(source: Record<string, any>, prefix: Array<string> = []): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  Object.keys(source).forEach((k) => {
    const v = (source as any)[k];
    const path = [...prefix, k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatten(v, path));
    } else if (typeof v === 'string') {
      out.push({ key: path.join('.'), value: v });
    }
  });
  return out;
}

function hasLatinOutsidePlaceholders(s: string): boolean {
  const stripped = s.replace(/\{[^}]*\}/g, '');
  return /[A-Za-z]/.test(stripped);
}

test('Akkadian catalogs contain no Latin letters', () => {
  const locales = [
    { name: 'akk (main)', data: getDefault(akkMain) },
    { name: 'akk (card)', data: getDefault(akkCard) },
  ];

  const violations: Array<{ locale: string; key: string; value: string }> = [];

  for (const { name, data } of locales) {
    for (const { key, value } of flatten(data)) {
      if (hasLatinOutsidePlaceholders(value)) violations.push({ locale: name, key, value });
    }
  }

  if (violations.length) {
    console.error('Cuneiform-only violations:', violations);
  }

  expect(violations.length).toBe(0);
});
