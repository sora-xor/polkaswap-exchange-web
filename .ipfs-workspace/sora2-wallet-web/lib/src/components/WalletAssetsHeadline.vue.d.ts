import { WalletFilteringOptions, type WalletAssetFilters } from '@/consts';
type __VLS_Props = {
  assetsFiatAmount?: string;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
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
  {} & {
    'update-filter': () => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
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
  false,
  {},
  any
>;
declare const _default: typeof __VLS_export;
export default _default;
