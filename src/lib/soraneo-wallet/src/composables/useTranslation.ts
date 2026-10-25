import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { computed } from 'vue';

import { TranslationConsts } from '@/consts';
import i18n from '@/lang';

dayjs.extend(localizedFormat);

type ValuesMap = Record<string, unknown> | undefined;

type TranslateFn = (key: string, values?: ValuesMap) => string;

type TranslateChoiceFn = (key: string, choice?: number, values?: ValuesMap) => string;

type TranslateExistsFn = (key: string) => boolean;

type FormatDateFn = (date: Nullable<number>, format?: string) => string;

type GetDayjsLocaleFn = () => string;

type TranslationHelpers = {
  readonly TranslationConsts: typeof TranslationConsts;
  readonly t: TranslateFn;
  readonly tc: TranslateChoiceFn;
  readonly te: TranslateExistsFn;
  readonly formatDate: FormatDateFn;
  readonly getDayjsLocale: GetDayjsLocaleFn;
};

function getValues(values?: ValuesMap): Record<string, unknown> {
  return { ...(values ?? {}), ...TranslationConsts };
}

const asyncWarnings = new Set<string>();

function coerceAsyncTranslateResult(value: unknown, key: string): string | null {
  if (!(value instanceof Promise)) return null;

  if (!asyncWarnings.has(key)) {
    asyncWarnings.add(key);
    console.warn(`[i18n] async wallet translation result detected for key "${key}". Falling back to key text.`);
  }

  return key;
}

function toSafeTranslateResult(value: unknown, key: string): string {
  const fallback = coerceAsyncTranslateResult(value, key);
  if (fallback !== null) return fallback;
  return String(value ?? '');
}

function resolveDayjsLocale(): string {
  const locale = i18n.global.locale.value.toLowerCase();

  switch (locale) {
    case 'hy':
      return 'hy-am';
    default:
      return locale;
  }
}

function buildTranslationHelpers(): TranslationHelpers {
  const t: TranslateFn = (key, values) => toSafeTranslateResult(i18n.global.t(key, getValues(values)), key);
  const tc: TranslateChoiceFn = (key, choice, values) => {
    const params = getValues(values);
    if (typeof choice === 'number') {
      params.count = choice;
    }
    return toSafeTranslateResult(i18n.global.t(key, params), key);
  };
  const te: TranslateExistsFn = (key) => i18n.global.te(key);
  const formatDate: FormatDateFn = (date, format = 'll LTS') => dayjs(date).locale(resolveDayjsLocale()).format(format);
  return {
    TranslationConsts,
    t,
    tc,
    te,
    formatDate,
    getDayjsLocale: resolveDayjsLocale,
  };
}

export function useTranslation() {
  const helpers = buildTranslationHelpers();
  const dayjsLocale = computed(() => helpers.getDayjsLocale());
  const formatDate: FormatDateFn = (date, format) =>
    dayjs(date)
      .locale(dayjsLocale.value)
      .format(format ?? 'll LTS');

  return {
    TranslationConsts,
    t: helpers.t,
    tc: helpers.tc,
    te: helpers.te,
    dayjsLocale,
    formatDate,
  };
}

export const translationUtils = buildTranslationHelpers;
