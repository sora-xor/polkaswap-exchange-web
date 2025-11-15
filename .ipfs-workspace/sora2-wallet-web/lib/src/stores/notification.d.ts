export interface ErrorMapping {
  pattern: string;
  translationKey: string;
}
export declare const useNotificationStore: import('pinia').StoreDefinition<
  'wallet-notification',
  Pick<
    {
      defaultErrorTranslationKey: import('vue').Ref<string, string>;
      errorMappings: import('vue').Ref<
        {
          pattern: string;
          translationKey: string;
        }[],
        | ErrorMapping[]
        | {
            pattern: string;
            translationKey: string;
          }[]
      >;
      setDefaultErrorTranslationKey: (key: string) => void;
      registerErrorMapping: (mapping: ErrorMapping) => void;
      replaceErrorMappings: (mappings: ErrorMapping[]) => void;
      resolveErrorMapping: (message: string) => ErrorMapping | undefined;
    },
    'defaultErrorTranslationKey' | 'errorMappings'
  >,
  Pick<
    {
      defaultErrorTranslationKey: import('vue').Ref<string, string>;
      errorMappings: import('vue').Ref<
        {
          pattern: string;
          translationKey: string;
        }[],
        | ErrorMapping[]
        | {
            pattern: string;
            translationKey: string;
          }[]
      >;
      setDefaultErrorTranslationKey: (key: string) => void;
      registerErrorMapping: (mapping: ErrorMapping) => void;
      replaceErrorMappings: (mappings: ErrorMapping[]) => void;
      resolveErrorMapping: (message: string) => ErrorMapping | undefined;
    },
    never
  >,
  Pick<
    {
      defaultErrorTranslationKey: import('vue').Ref<string, string>;
      errorMappings: import('vue').Ref<
        {
          pattern: string;
          translationKey: string;
        }[],
        | ErrorMapping[]
        | {
            pattern: string;
            translationKey: string;
          }[]
      >;
      setDefaultErrorTranslationKey: (key: string) => void;
      registerErrorMapping: (mapping: ErrorMapping) => void;
      replaceErrorMappings: (mappings: ErrorMapping[]) => void;
      resolveErrorMapping: (message: string) => ErrorMapping | undefined;
    },
    'setDefaultErrorTranslationKey' | 'registerErrorMapping' | 'replaceErrorMappings' | 'resolveErrorMapping'
  >
>;
