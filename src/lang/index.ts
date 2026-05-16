import dayjs from 'dayjs/esm';
import type { ComponentInternalInstance } from 'vue';
import { createI18n, type MissingHandler } from 'vue-i18n';

import { TranslationConsts } from '@/consts/app';
import { Language } from '@/consts/language';
import { getLocaleDirection } from '@/lang/direction';
import { getBuildVariant, trackEvent } from '@/utils/telemetry';
import { settingsStorage } from '@/utils/storage';

export const TRANSLATION_MISSING_THROTTLE_MS = 30_000;

const recentMissingTranslations = new Map<string, number>();

/**
 * Clears the duplicate-suppression cache for translation missing events (primarily for tests).
 */
export const resetTranslationMissingThrottle = (): void => {
  recentMissingTranslations.clear();
};

const getComponentName = (instance?: ComponentInternalInstance | null): string => {
  const type = instance?.type as Record<string, unknown> | undefined;
  const name = (type?.name ?? (type as Record<string, unknown> | undefined)?.__name) as string | undefined;
  return typeof name === 'string' && name.length > 0 ? name : 'unknown';
};

/**
 * Handles missing translation keys by emitting a telemetry event with minimal, non-PII context.
 */
export const translationMissingHandler: MissingHandler = (locale, key, instance) => {
  const cacheKey = `${locale}:${key}`;
  const now = Date.now();
  const lastSeenAt = recentMissingTranslations.get(cacheKey) ?? 0;

  if (now - lastSeenAt < TRANSLATION_MISSING_THROTTLE_MS) {
    return;
  }

  recentMissingTranslations.set(cacheKey, now);

  trackEvent('translation_missing', {
    key,
    locale,
    component: getComponentName(instance),
    buildVariant: getBuildVariant(),
  });
};

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: Language.EN,
  fallbackLocale: Language.EN,
  messages: {},
  warnHtmlMessage: false,
  missing: translationMissingHandler,
});

const i18nGlobal = i18n.global;
const loadedLanguages: Array<string> = [];
applyDocumentLocaleAttributes(Language.EN);

const LOCALIZED_TRANSLATION_CONST_DEFAULTS = {
  AppName: TranslationConsts.AppName,
  Sora: TranslationConsts.Sora,
  VAL: TranslationConsts.VAL,
} as const;

const AKK_TRANSLATION_CONST_OVERRIDES = {
  AppName: '𒊹𒂵𒆜',
  Sora: '𒀭',
  VAL: '𒋾',
} as const;

type LocalizedTranslationConstKey = keyof typeof LOCALIZED_TRANSLATION_CONST_DEFAULTS;
type MutableLocalizedTranslationConsts = Record<LocalizedTranslationConstKey, string>;

/**
 * Applies document-level locale attributes used by browser text shaping,
 * accessibility, RTL layout, and locale-specific typography rules.
 */
function applyDocumentLocaleAttributes(locale: string): void {
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale);
      document.documentElement.setAttribute('dir', getLocaleDirection(locale));
    }
  } catch (e) {
    // noop: environment may not have document (tests)
  }
}

/**
 * Keeps mutable i18n interpolation constants in sync with the active locale.
 * They are merged into every translation call, so locale-specific overrides must
 * be reset before applying overrides for the newly selected locale.
 */
function applyTranslationConstLocaleOverrides(locale: Language): void {
  const mutableConsts = TranslationConsts as unknown as MutableLocalizedTranslationConsts;

  Object.assign(mutableConsts, LOCALIZED_TRANSLATION_CONST_DEFAULTS);

  if (locale === Language.AKK) {
    Object.assign(mutableConsts, AKK_TRANSLATION_CONST_OVERRIDES);
  }
}

const hasLocale = (locale: string) => Object.values(Language).includes(locale as any);
const getBaseLocale = (locale: string): string => locale.split('-')[0] ?? locale;

export const getSupportedLocale = (locale: Language): string => {
  if (hasLocale(locale)) return locale;

  if (locale.includes('-')) {
    return getSupportedLocale(getBaseLocale(locale) as Language);
  }

  return Language.EN;
};

export function getLocale(): string {
  const locale = settingsStorage.get('language') || ((navigator.language || (navigator as any).userLanguage) as string);

  return getSupportedLocale(locale as Language);
}

export async function setDayJsLocale(lang: Language): Promise<void> {
  const locale = getSupportedLocale(lang);
  let code: string = locale;

  if (locale !== Language.ZH_CN && locale !== Language.ZH_TW && locale.includes('-')) {
    code = getBaseLocale(locale);
  }

  if (code === 'zh') {
    code = Language.ZH_CN;
  }

  if (locale === Language.ZH_CN || locale === Language.ZH_TW) {
    code = locale;
  }

  const dayjsLocale = code.toLowerCase();

  try {
    const { default: preset } = dayjsLocale !== Language.EN ? await import(`dayjs/esm/locale/${dayjsLocale}.js`) : {};
    dayjs.locale(dayjsLocale, preset, false);
  } catch (error) {
    console.warn(`[dayjs]: unsupported locale "${code}"`, error);
  }
}

export async function setI18nLocale(lang: Language): Promise<void> {
  const locale = getSupportedLocale(lang) as Language;

  if (!loadedLanguages.includes(locale)) {
    // transform locale string 'eu-ES' to filename 'eu_ES' like in localise
    const filename = locale.replace('-', '_');
    const messagesModule = await import(`@/lang/${filename}.json`);

    i18nGlobal.setLocaleMessage(locale, { ...messagesModule.default });
    loadedLanguages.push(locale);
  }

  applyTranslationConstLocaleOverrides(locale);
  i18nGlobal.locale.value = locale;
  applyDocumentLocaleAttributes(locale);
}
const globalComposer = i18n.global as Record<string, unknown>;
if (typeof globalComposer.rt !== 'function') {
  globalComposer.rt = (...args: unknown[]) => (i18n.global as any).t(...(args as [unknown]));
}

export default i18n;
