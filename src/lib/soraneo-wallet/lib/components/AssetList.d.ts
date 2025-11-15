import { Asset } from '@sora-substrate/sdk/build/assets/types';

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
declare function __VLS_template(): Partial<Record<string, (_: any) => any>> & {
  'list-empty'?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<Props>,
      {
        assets: () => never[];
        size: number;
        divider: boolean;
        withClickableLogo: boolean;
        selected: () => never[];
        selectable: boolean;
        pinnable: boolean;
        pinned: () => never[];
        withFiat: boolean;
        withTabindex: boolean;
      }
    >
  >,
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
  Readonly<
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<Props>,
        {
          assets: () => never[];
          size: number;
          divider: boolean;
          withClickableLogo: boolean;
          selected: () => never[];
          selectable: boolean;
          pinnable: boolean;
          pinned: () => never[];
          withFiat: boolean;
          withTabindex: boolean;
        }
      >
    >
  > &
    Readonly<{}>,
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
