import { KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';

declare const _default: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        fee?: string;
        symbol?: string;
        payoff?: boolean;
      }>,
      {
        fee: undefined;
        symbol: KnownSymbols;
        payoff: boolean;
      }
    >
  >,
  {
    hidePopup: import('vue').Ref<boolean, boolean>;
    handleConfirm: () => Promise<void>;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {
    confirm: () => void;
  },
  string,
  import('vue').PublicProps,
  Readonly<
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<{
          fee?: string;
          symbol?: string;
          payoff?: boolean;
        }>,
        {
          fee: undefined;
          symbol: KnownSymbols;
          payoff: boolean;
        }
      >
    >
  > &
    Readonly<{
      onConfirm?: (() => any) | undefined;
    }>,
  {
    symbol: string;
    fee: string;
    payoff: boolean;
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
