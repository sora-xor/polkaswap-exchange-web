import { beforeEach, describe, expect, it, vi } from 'vitest';

const i18nGlobal = vi.hoisted(() => ({
  locale: { value: 'en' },
  t: vi.fn((key: string) => key),
  te: vi.fn(() => true),
}));

vi.mock('@/consts', () => ({
  TranslationConsts: {
    AppName: 'Polkaswap',
    Network: 'SORA',
  },
}));

vi.mock('@/lang', () => ({
  __esModule: true,
  default: {
    global: i18nGlobal,
  },
}));

import { translationUtils, useTranslation } from '@/lib/soraneo-wallet/src/composables/useTranslation';

describe('wallet useTranslation composable', () => {
  beforeEach(() => {
    i18nGlobal.locale.value = 'en';
    i18nGlobal.t.mockReset();
    i18nGlobal.t.mockImplementation((key: string) => key);
    i18nGlobal.te.mockReset();
    i18nGlobal.te.mockImplementation(() => true);
  });

  it('passes TranslationConsts and count to i18n for pluralized keys', () => {
    i18nGlobal.t.mockImplementation((key: string, values?: Record<string, unknown>) => {
      return `${key}:${String(values?.count ?? 'n/a')}:${String(values?.AppName ?? '')}`;
    });

    const { tc } = useTranslation();
    const translated = tc('wallet.assets', 2, { custom: 'value' });

    expect(translated).toBe('wallet.assets:2:Polkaswap');
    expect(i18nGlobal.t).toHaveBeenCalledWith(
      'wallet.assets',
      expect.objectContaining({
        AppName: 'Polkaswap',
        Network: 'SORA',
        custom: 'value',
        count: 2,
      })
    );
  });

  it('normalizes hy locale for dayjs', () => {
    i18nGlobal.locale.value = 'hy';

    const { dayjsLocale } = useTranslation();

    expect(dayjsLocale.value).toBe('hy-am');
  });

  it('coerces async translation results to key text', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    i18nGlobal.t.mockImplementation(() => Promise.resolve('translated'));

    const { t } = useTranslation();

    const utilTranslation = translationUtils();

    expect(t('wallet.async.title')).toBe('wallet.async.title');
    expect(utilTranslation.t('wallet.async.utils')).toBe('wallet.async.utils');
    expect(warnSpy).toHaveBeenCalledWith(
      '[i18n] async wallet translation result detected for key "wallet.async.title". Falling back to key text.'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[i18n] async wallet translation result detected for key "wallet.async.utils". Falling back to key text.'
    );

    warnSpy.mockRestore();
  });
});
