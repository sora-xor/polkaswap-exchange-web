import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const telemetry = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
  getBuildVariantMock: vi.fn(() => 'vue3-native'),
}));

vi.mock('@/utils/telemetry', () => ({
  trackEvent: telemetry.trackEventMock,
  getBuildVariant: telemetry.getBuildVariantMock,
}));

describe('translationMissingHandler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    telemetry.trackEventMock.mockClear();
    telemetry.getBuildVariantMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const loadModule = async () => {
    const module = await import('@/lang');
    module.resetTranslationMissingThrottle();
    return module;
  };

  it('emits telemetry for missing translations', async () => {
    const { translationMissingHandler } = await loadModule();

    translationMissingHandler('fr', 'orders.missingKey', { type: { name: 'TestComponent' } } as any);

    expect(telemetry.trackEventMock).toHaveBeenCalledWith('translation_missing', {
      key: 'orders.missingKey',
      locale: 'fr',
      component: 'TestComponent',
      buildVariant: 'vue3-native',
    });
  });

  it('throttles duplicate missing translations', async () => {
    const { translationMissingHandler, TRANSLATION_MISSING_THROTTLE_MS } = await loadModule();

    translationMissingHandler('es', 'orders.missingKey', null);
    translationMissingHandler('es', 'orders.missingKey', null);

    expect(telemetry.trackEventMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(TRANSLATION_MISSING_THROTTLE_MS);

    translationMissingHandler('es', 'orders.missingKey', null);

    expect(telemetry.trackEventMock).toHaveBeenCalledTimes(2);
  });

  it('normalizes browser locales to supported base locales without lodash startup helpers', async () => {
    const { getSupportedLocale } = await loadModule();

    expect(getSupportedLocale('en-AU' as any)).toBe('en');
    expect(getSupportedLocale('zh-CN' as any)).toBe('zh-CN');
    expect(getSupportedLocale('zh_cn' as any)).toBe('zh-CN');
    expect(getSupportedLocale('ar_EG' as any)).toBe('ar');
    expect(getSupportedLocale('he-IL' as any)).toBe('he');
    expect(getSupportedLocale('UR-PK' as any)).toBe('ur');
    expect(getSupportedLocale('dv_MV' as any)).toBe('dv');
    expect(getSupportedLocale('unsupported' as any)).toBe('en');
  });

  it('loads the default English catalog lazily', async () => {
    const { default: i18n, setI18nLocale } = await loadModule();
    const composer = i18n.global as any;

    expect(composer.te('swapText')).toBe(false);

    await setI18nLocale('en' as any);

    expect(composer.te('swapText')).toBe(true);
  });

  it('applies document locale attributes for supported RTL typography and layout', async () => {
    const { setI18nLocale } = await loadModule();

    for (const locale of ['ar', 'he', 'ur', 'dv']) {
      await setI18nLocale(locale as any);

      expect(document.documentElement.getAttribute('lang')).toBe(locale);
      expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    }

    await setI18nLocale('en' as any);

    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('restores localized interpolation constants when switching back to English', async () => {
    const { setI18nLocale } = await loadModule();
    const { TranslationConsts } = await import('@/consts/app');

    await setI18nLocale('akk' as any);

    expect(TranslationConsts.AppName).toBe('𒊹𒂵𒆜');
    expect(TranslationConsts.Sora).toBe('𒀭');
    expect(TranslationConsts.VAL).toBe('𒋾');

    await setI18nLocale('en' as any);

    expect(TranslationConsts.AppName).toBe('Polkaswap');
    expect(TranslationConsts.Sora).toBe('SORA');
    expect(TranslationConsts.VAL).toBe('VAL');
  });
});
