// @vitest-environment node

import { DEFAULT_MESSAGES } from '@sora/sora-pay/widget';
import { describe, expect, it } from 'vitest';

import en from '@/lang/en.json';

type Catalog = { communityStore: { widget: Record<string, string> } };
const catalogs = import.meta.glob<Catalog>('../../../../src/lang/*.json', { eager: true, import: 'default' });

describe('packaged Sora Pay translations', () => {
  it('provides every installed widget message in every locale', () => {
    expect(Object.keys(catalogs).length).toBeGreaterThanOrEqual(31);
    for (const [file, catalog] of Object.entries(catalogs)) {
      const messages = catalog.communityStore.widget;
      for (const key of Object.keys(DEFAULT_MESSAGES)) {
        expect(messages[key], `${file}: ${key}`).toEqual(expect.any(String));
        expect(messages[key].trim(), `${file}: ${key}`).not.toBe('');
      }
    }
  });

  it('uses the packaged balance explanation in English', () => {
    expect(en.communityStore.widget.insufficientBalance).toBe(DEFAULT_MESSAGES.insufficientBalance);
    expect(DEFAULT_MESSAGES.insufficientBalance).toContain('payment and network fee');
  });
});
