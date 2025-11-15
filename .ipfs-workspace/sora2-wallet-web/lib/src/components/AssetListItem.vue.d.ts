import type { Asset } from '@sora-substrate/sdk/build/assets/types';
type __VLS_Props = {
  asset: Asset;
  withClickableLogo?: boolean;
  selected?: boolean;
  selectable?: boolean;
  pinnable?: boolean;
  pinned?: boolean;
  withFiat?: boolean;
  withTabindex?: boolean;
};
declare var __VLS_8: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    isMintable: boolean;
    content?: string;
    description?: string;
    type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
  },
  __VLS_14: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    isMintable: boolean;
    content?: string;
    description?: string;
    type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
  },
  __VLS_16: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    isMintable: boolean;
    content?: string;
    description?: string;
    type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
  };
type __VLS_Slots = {} & {
  value?: (props: typeof __VLS_8) => any;
} & {
  append?: (props: typeof __VLS_14) => any;
} & {
  default?: (props: typeof __VLS_16) => any;
};
declare const __VLS_base: import('vue').DefineComponent<
  __VLS_Props,
  {
    handleIconClick: (event: Event) => void;
    pin: (event: Event) => void;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {} & {
    'show-details': (asset: Asset) => any;
    pin: (asset: Asset) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      'onShow-details'?: ((asset: Asset) => any) | undefined;
      onPin?: ((asset: Asset) => any) | undefined;
    }>,
  {
    withClickableLogo: boolean;
    selected: boolean;
    selectable: boolean;
    pinnable: boolean;
    pinned: boolean;
    withFiat: boolean;
    withTabindex: boolean;
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
