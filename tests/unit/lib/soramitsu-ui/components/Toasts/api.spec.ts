import { describe, expect, it } from 'vitest';

import { defineToastsApi } from '@/lib/soramitsu-ui/components/Toasts/api';

const readToasts = (api: ReturnType<typeof defineToastsApi>) => {
  const value = (api as any).toasts;
  return Array.isArray(value) ? value : value.value;
};

describe('defineToastsApi', () => {
  it('registers toasts with incrementing keys and removes them through the unregister callback', () => {
    const api = defineToastsApi();
    const first = { slot: () => null };
    const second = { slot: () => null };

    const unregisterFirst = api.register(first);
    const unregisterSecond = api.register(second);

    expect(readToasts(api)).toEqual([
      [0, first],
      [1, second],
    ]);

    unregisterFirst();
    expect(readToasts(api)).toEqual([[1, second]]);

    unregisterSecond();
    expect(readToasts(api)).toEqual([]);
  });
});
