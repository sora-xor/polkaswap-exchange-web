import { afterEach, describe, expect, it } from 'vitest';

import { appRouterLoading, setAppRouterLoading } from '@/app/navigation/loading';

describe('app router loading state', () => {
  afterEach(() => {
    setAppRouterLoading(false);
  });

  it('tracks router loading through the app-owned shell state', () => {
    expect(appRouterLoading.value).toBe(false);

    setAppRouterLoading(true);
    expect(appRouterLoading.value).toBe(true);

    setAppRouterLoading(false);
    expect(appRouterLoading.value).toBe(false);
  });
});
