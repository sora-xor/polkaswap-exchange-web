import type { Asset } from '@sora-substrate/sdk/build/assets/types';
type Props = {
  assets?: Asset[];
  size?: number;
  divider?: boolean;
  withClickableLogo?: boolean;
  selected?: Asset[];
  selectable?: boolean;
  pinnable?: boolean;
  pinned?: Asset[];
  withFiat?: boolean;
  withTabindex?: boolean;
};
declare var __VLS_12: {}, __VLS_21: string, __VLS_22: any;
type __VLS_Slots = {} & {
  [K in NonNullable<typeof __VLS_21>]?: (props: typeof __VLS_22) => any;
} & {
  'list-empty'?: (props: typeof __VLS_12) => any;
};
declare const __VLS_base: import('vue').DefineComponent<
  Props,
  {
    wrap: any;
    barSize: import('vue').Ref<number, number>;
    barMove: import('vue').Ref<number, number>;
    scrollHeight: import('vue').Ref<number, number>;
    forwardedSlots: import('vue').ComputedRef<string[]>;
    wrapListeners: (asset: Asset) => Record<string, (...args: unknown[]) => void>;
    isEmptyList: import('vue').ComputedRef<boolean>;
    itemHeightValue: import('vue').ComputedRef<number>;
    gutterOffset: import('vue').ComputedRef<number>;
    style: import('vue').ComputedRef<{
      height: string;
      marginRight: string;
    }>;
    handleScroll: () => void;
    scrollTo: (value: number) => void;
    isSelected: (asset: Asset) => boolean;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  import('vue').PublicProps,
  Readonly<Props> & Readonly<{}>,
  {
    assets: Asset[];
    size: number;
    withClickableLogo: boolean;
    selected: Asset[];
    selectable: boolean;
    pinnable: boolean;
    pinned: Asset[];
    withFiat: boolean;
    withTabindex: boolean;
    divider: boolean;
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
