import { AccountIdentity, PolkadotJsAccount } from '../../types/common';
import { WithConnectionApi } from '@sora-substrate/sdk';

declare function __VLS_template(): {
  default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        polkadotAccount?: Nullable<PolkadotJsAccount>;
        withIdentity?: boolean;
        chainApi?: Nullable<WithConnectionApi>;
      }>,
      {
        polkadotAccount: null;
        withIdentity: boolean;
        chainApi: null;
      }
    >
  >,
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
  {
    identity: (identity: Nullable<AccountIdentity>) => void;
  },
  string,
  import('vue').PublicProps,
  Readonly<
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<{
          polkadotAccount?: Nullable<PolkadotJsAccount>;
          withIdentity?: boolean;
          chainApi?: Nullable<WithConnectionApi>;
        }>,
        {
          polkadotAccount: null;
          withIdentity: boolean;
          chainApi: null;
        }
      >
    >
  > &
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
  true,
  {},
  any
>;
declare const _default: __VLS_WithTemplateSlots<typeof __VLS_component, ReturnType<typeof __VLS_template>>;
export default _default;
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToRuntimeProps<T> = {
  [K in keyof T]-?: {} extends Pick<T, K>
    ? {
        type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>>;
      }
    : {
        type: import('vue').PropType<T[K]>;
        required: true;
      };
};
type __VLS_WithDefaults<P, D> = {
  [K in keyof Pick<P, keyof P>]: K extends keyof D
    ? __VLS_Prettify<
        P[K] & {
          default: D[K];
        }
      >
    : P[K];
};
type __VLS_Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
type __VLS_WithTemplateSlots<T, S> = T & {
  new (): {
    $slots: S;
  };
};
