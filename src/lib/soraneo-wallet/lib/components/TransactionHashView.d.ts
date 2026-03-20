import { HashType, ExplorerType } from '../consts';

declare const _default: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        value: string;
        type: HashType;
        translation: string;
        hash?: string;
        block?: string;
      }>,
      {
        hash: string;
        block: string;
      }
    >
  >,
  {
    handleCopyAddress: (address: string, event?: PointerEvent | MouseEvent | undefined) => Promise<void>;
    copyTooltip: (tooltipCopyValue?: string) => string;
    getExplorerTranslation: (type: ExplorerType) => 'Polkadot' | 'SORAScan' | 'SoraMetrics' | 'Subscan' | '';
    handleOpenEtherscan: () => void;
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
        __VLS_TypePropsToRuntimeProps<{
          value: string;
          type: HashType;
          translation: string;
          hash?: string;
          block?: string;
        }>,
        {
          hash: string;
          block: string;
        }
      >
    >
  > &
    Readonly<{}>,
  {
    block: string;
    hash: string;
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
