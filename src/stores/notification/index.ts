import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ErrorMapping = {
  pattern: string;
  translationKey: string;
};

const DEFAULT_ERROR_TRANSLATION_KEY = 'unknownErrorText';
const DEFAULT_ERROR_MAPPINGS: ErrorMapping[] = [
  { pattern: 'Invalid decoded address', translationKey: 'walletSend.errorAddress' },
  { pattern: 'Invalid bip39 mnemonic specified', translationKey: 'desktop.errorMessages.mnemonic' },
  { pattern: 'Unable to decode using the supplied passphrase', translationKey: 'desktop.errorMessages.password' },
  { pattern: 'is not allowed to interact with this extension', translationKey: 'polkadotjs.noSigner' },
];

/**
 * Pinia store that centralises notification error handling so composables can
 * map raw SDK or wallet errors onto translated copy.
 */
export const useNotificationStore = defineStore('notification', () => {
  const defaultErrorTranslationKey = ref(DEFAULT_ERROR_TRANSLATION_KEY);
  const errorMappings = ref<ErrorMapping[]>([...DEFAULT_ERROR_MAPPINGS]);

  const setDefaultErrorTranslationKey = (key: string) => {
    defaultErrorTranslationKey.value = key || DEFAULT_ERROR_TRANSLATION_KEY;
  };

  const registerErrorMapping = (mapping: ErrorMapping) => {
    const exists = errorMappings.value.some((item) => item.pattern === mapping.pattern);
    if (!exists) {
      errorMappings.value = [...errorMappings.value, mapping];
    }
  };

  const replaceErrorMappings = (mappings: ErrorMapping[]) => {
    errorMappings.value = [...mappings];
  };

  const resolveErrorMapping = (message?: string): ErrorMapping | undefined => {
    if (!message) return undefined;
    return errorMappings.value.find((item) => message.includes(item.pattern));
  };

  return {
    defaultErrorTranslationKey,
    errorMappings,
    setDefaultErrorTranslationKey,
    registerErrorMapping,
    replaceErrorMappings,
    resolveErrorMapping,
  };
});

export type NotificationStore = ReturnType<typeof useNotificationStore>;
