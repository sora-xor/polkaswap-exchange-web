import { PolkadotJsAccount } from '../types/common';

declare const _default: import('vue').DefineComponent<
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
export default _default;
