import type { AccountIdentity, PolkadotJsAccount } from '@/types/common';
import type { WithConnectionApi } from '@sora-substrate/sdk';
type __VLS_Props = {
  polkadotAccount?: Nullable<PolkadotJsAccount>;
  withIdentity?: boolean;
  chainApi?: Nullable<WithConnectionApi>;
};
declare var __VLS_22: {};
type __VLS_Slots = {} & {
  default?: (props: typeof __VLS_22) => any;
};
declare const __VLS_base: import('vue').DefineComponent<
  __VLS_Props,
  {
    account: import('vue').ComputedRef<Nullable<PolkadotJsAccount>>;
    address: import('vue').ComputedRef<string>;
    name: import('vue').ComputedRef<string>;
    identity: import('vue').ComputedRef<Nullable<AccountIdentity>>;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {} & {
    identity: (identity: Nullable<AccountIdentity>) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      onIdentity?: ((identity: Nullable<AccountIdentity>) => any) | undefined;
    }>,
  {
    polkadotAccount: PolkadotJsAccount | null;
    withIdentity: boolean;
    chainApi: WithConnectionApi | null;
  },
  {},
  {},
  {},
  string,
  import('vue').ComponentProvideOptions,
  false,
  {},
  any
>;
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
  new (): {
    $slots: S;
  };
};
