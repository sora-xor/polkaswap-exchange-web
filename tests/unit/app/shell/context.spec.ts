import { afterEach, describe, expect, it, vi } from 'vitest';

const vueMocks = vi.hoisted(() => ({
  inject: vi.fn(),
}));

vi.mock('vue', () => ({
  inject: vueMocks.inject,
}));

import { provideAppShellKey, useAppShellContext } from '@/app/shell/context';

afterEach(() => {
  vi.clearAllMocks();
});

describe('app shell context', () => {
  it('returns the injected app-shell context with the shared provide key', () => {
    const shellContext = {
      menuVisible: true,
      toggleMenu: vi.fn(),
    };
    vueMocks.inject.mockReturnValue(shellContext);

    expect(useAppShellContext()).toBe(shellContext);
    expect(vueMocks.inject).toHaveBeenCalledWith(provideAppShellKey);
  });

  it('throws when app-shell context is unavailable', () => {
    vueMocks.inject.mockReturnValue(undefined);

    expect(() => useAppShellContext()).toThrow('App shell context is not available.');
  });
});
