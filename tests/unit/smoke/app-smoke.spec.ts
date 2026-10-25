import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/components/App/Header/AppHeader.vue', () => ({
  __esModule: true,
  default: {},
}));

vi.mock('@/components/App/Footer/AppFooter.vue', () => ({
  __esModule: true,
  default: {},
}));

const { localStorageMock } = vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage };
});

describe('Smoke', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  test('AppHeader mountable token', async () => {
    const { default: AppHeader } = await import('@/components/App/Header/AppHeader.vue');
    expect(AppHeader).toBeTruthy();
  });

  test('AppFooter mountable token', async () => {
    const { default: AppFooter } = await import('@/components/App/Footer/AppFooter.vue');
    expect(AppFooter).toBeTruthy();
  });
});
