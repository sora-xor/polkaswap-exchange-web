import { Asset } from '@sora-substrate/sdk/build/assets/types';

declare function __VLS_template(): {
  value?(_: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    isMintable: boolean;
    content?: string;
    description?: string;
    type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
  }): any;
  append?(_: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    isMintable: boolean;
    content?: string;
    description?: string;
    type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
  }): any;
  default?(_: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    isMintable: boolean;
    content?: string;
    description?: string;
    type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
  }): any;
};
declare const __VLS_component: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        asset: Asset;
        withClickableLogo?: boolean;
        selected?: boolean;
        selectable?: boolean;
        pinnable?: boolean;
        pinned?: boolean;
        withFiat?: boolean;
        withTabindex?: boolean;
      }>,
      {
        withClickableLogo: boolean;
        selected: boolean;
        selectable: boolean;
        pinnable: boolean;
        pinned: boolean;
        withFiat: boolean;
        withTabindex: boolean;
      }
    >
  >,
  {
    handleIconClick: (event: Event) => void;
    pin: (event: Event) => void;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {
    'show-details': (asset: Asset) => void;
    pin: (asset: Asset) => void;
  },
  string,
  import('vue').PublicProps,
  Readonly<
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<{
          asset: Asset;
          withClickableLogo?: boolean;
          selected?: boolean;
          selectable?: boolean;
          pinnable?: boolean;
          pinned?: boolean;
          withFiat?: boolean;
          withTabindex?: boolean;
        }>,
        {
          withClickableLogo: boolean;
          selected: boolean;
          selectable: boolean;
          pinnable: boolean;
          pinned: boolean;
          withFiat: boolean;
          withTabindex: boolean;
        }
      >
    >
  > &
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
