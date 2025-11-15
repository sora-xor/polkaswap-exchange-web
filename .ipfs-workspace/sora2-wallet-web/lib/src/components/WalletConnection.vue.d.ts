import type { PolkadotJsAccount } from '@/types/common';
declare const __VLS_export: import('vue').DefineComponent<
  {},
  {
    loginAccount: (payload: PolkadotJsAccount) => Promise<void>;
    logoutAccount: () => Promise<void>;
    renameAccount: (data: { address: string; name: string }) => Promise<void>;
    checkConnectedAccountSource: (source: string) => Promise<void>;
    navigateToAccount: () => void;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  import('vue').PublicProps,
  Readonly<{}> & Readonly<{}>,
  {},
  {},
  {},
  {},
  string,
  import('vue').ComponentProvideOptions,
  true,
  {},
  any
>;
declare const _default: typeof __VLS_export;
export default _default;
