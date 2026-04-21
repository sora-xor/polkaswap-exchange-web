import { beforeEach, describe, expect, it, vi } from 'vitest';

const walletTranslationMocks = vi.hoisted(() => ({
  tMock: vi.fn((key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key
  ),
  tcMock: vi.fn((key: string, choice?: number, values?: Record<string, unknown>) =>
    `${key}:${choice ?? 'none'}:${JSON.stringify(values ?? {})}`
  ),
  teMock: vi.fn((key: string) => key === 'known.key'),
  getDayjsLocaleMock: vi.fn(() => 'ja'),
  formatDateMock: vi.fn((date: number | null | undefined, format = 'll LTS') => `${date ?? 'null'}:${format}`),
  useSettingsStoreMock: vi.fn(() => ({ language: 'fr' })),
}));

vi.mock('@/composables/useTranslation', () => ({
  translationUtils: () => ({
    t: (...args: Parameters<typeof walletTranslationMocks.tMock>) => walletTranslationMocks.tMock(...args),
    tc: (...args: Parameters<typeof walletTranslationMocks.tcMock>) => walletTranslationMocks.tcMock(...args),
    te: (...args: Parameters<typeof walletTranslationMocks.teMock>) => walletTranslationMocks.teMock(...args),
    getDayjsLocale: (...args: Parameters<typeof walletTranslationMocks.getDayjsLocaleMock>) =>
      walletTranslationMocks.getDayjsLocaleMock(...args),
    formatDate: (...args: Parameters<typeof walletTranslationMocks.formatDateMock>) =>
      walletTranslationMocks.formatDateMock(...args),
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: (...args: Parameters<typeof walletTranslationMocks.useSettingsStoreMock>) =>
    walletTranslationMocks.useSettingsStoreMock(...args),
}));

import { TranslationConsts } from '@/lib/soraneo-wallet/src/consts';
import { useWalletTranslation } from '@/lib/soraneo-wallet/src/composables/useWalletTranslation';

describe('wallet useWalletTranslation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletTranslationMocks.useSettingsStoreMock.mockImplementation(() => ({ language: 'fr' }));
  });

  it('exposes translation wrappers, constants, and the selected language', () => {
    const translation = useWalletTranslation();

    expect(translation.language.value).toBe('fr');
    expect(translation.TranslationConsts).toBe(TranslationConsts);
    expect(translation.t('wallet.key', { count: 2 })).toBe('wallet.key:{"count":2}');
    expect(translation.tc('wallet.choice', 3, { value: 1 })).toBe('wallet.choice:3:{"value":1}');
    expect(translation.te('known.key')).toBe(true);
    expect(translation.dayjsLocale.value).toBe('ja');
    expect(translation.formatDate(1234, 'YYYY-MM-DD')).toBe('1234:YYYY-MM-DD');
  });

  it('falls back to english when the settings store is unavailable', () => {
    walletTranslationMocks.useSettingsStoreMock.mockImplementation(() => {
      throw new Error('settings unavailable');
    });

    const translation = useWalletTranslation();

    expect(translation.language.value).toBe('en');
  });
});
