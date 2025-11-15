import { WalletFilteringOptions, WalletAssetFilters } from '../consts';

declare const _default: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        assetsFiatAmount?: string;
      }>,
      {
        assetsFiatAmount: string;
      }
    >
  >,
  {
    onlyVerifiedAssets: import('vue').WritableComputedRef<boolean, boolean>;
    zeroBalanceAssets: import('vue').WritableComputedRef<boolean, boolean>;
    selectedFilter: import('vue').WritableComputedRef<WalletFilteringOptions, WalletFilteringOptions>;
    getLabel: (index: number) => WalletFilteringOptions;
    updateFilters: <K extends keyof WalletAssetFilters>(key: K, value: WalletAssetFilters[K]) => void;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {
    'update-filter': () => void;
  },
  string,
  import('vue').PublicProps,
  Readonly<
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<{
          assetsFiatAmount?: string;
        }>,
        {
          assetsFiatAmount: string;
        }
      >
    >
  > &
    Readonly<{
      'onUpdate-filter'?: (() => any) | undefined;
    }>,
  {
    assetsFiatAmount: string;
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
