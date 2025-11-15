import { PolkadotJsAccount } from '../../types/common';

declare const _default: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        visible?: boolean;
        accounts?: PolkadotJsAccount[];
        records?: PolkadotJsAccount[];
        excludedAddress?: string;
      }>,
      {
        visible: boolean;
        accounts: () => PolkadotJsAccount[];
        records: () => PolkadotJsAccount[];
        excludedAddress: string;
      }
    >
  >,
  {},
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {
    'update:visible': (value: boolean) => void;
    close: () => void;
    select: (value: PolkadotJsAccount) => void;
    open: (address: Nullable<string>, isEditMode?: boolean | undefined) => void;
    remove: (address: string) => void;
  },
  string,
  import('vue').PublicProps,
  Readonly<
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<{
          visible?: boolean;
          accounts?: PolkadotJsAccount[];
          records?: PolkadotJsAccount[];
          excludedAddress?: string;
        }>,
        {
          visible: boolean;
          accounts: () => PolkadotJsAccount[];
          records: () => PolkadotJsAccount[];
          excludedAddress: string;
        }
      >
    >
  > &
    Readonly<{
      onSelect?: ((value: PolkadotJsAccount) => any) | undefined;
      onClose?: (() => any) | undefined;
      onRemove?: ((address: string) => any) | undefined;
      'onUpdate:visible'?: ((value: boolean) => any) | undefined;
      onOpen?: ((address: Nullable<string>, isEditMode?: boolean | undefined) => any) | undefined;
    }>,
  {
    accounts: PolkadotJsAccount[];
    visible: boolean;
    records: PolkadotJsAccount[];
    excludedAddress: string;
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
