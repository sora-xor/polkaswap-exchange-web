import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ErrorMapping {
  pattern: string;
  translationKey: string;
}

export const useNotificationStore = defineStore('wallet-notification', () => {
  const defaultErrorTranslationKey = ref('unknownErrorText');
  const errorMappings = ref<ErrorMapping[]>([
    { pattern: 'Invalid decoded address', translationKey: 'walletSend.errorAddress' },
    { pattern: 'Invalid bip39 mnemonic specified', translationKey: 'desktop.errorMessages.mnemonic' },
    { pattern: 'Unable to decode using the supplied passphrase', translationKey: 'desktop.errorMessages.password' },
    { pattern: 'is not allowed to interact with this extension', translationKey: 'polkadotjs.noSigner' },
  ]);

  function setDefaultErrorTranslationKey(key: string) {
    defaultErrorTranslationKey.value = key;
  }

  function registerErrorMapping(mapping: ErrorMapping) {
    const exists = errorMappings.value.some((item) => item.pattern === mapping.pattern);
    if (!exists) {
      errorMappings.value = [...errorMappings.value, mapping];
    }
  }

  function replaceErrorMappings(mappings: ErrorMapping[]) {
    errorMappings.value = [...mappings];
  }

  function resolveErrorMapping(message: string): ErrorMapping | undefined {
    return errorMappings.value.find((item) => message.includes(item.pattern));
  }

  return {
    defaultErrorTranslationKey,
    errorMappings,
    setDefaultErrorTranslationKey,
    registerErrorMapping,
    replaceErrorMappings,
    resolveErrorMapping,
  };
});
