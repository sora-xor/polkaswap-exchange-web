import { HashType, ExplorerType } from '@/consts';
type __VLS_Props = {
  value: string;
  type: HashType;
  translation: string;
  hash?: string;
  block?: string;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {
    handleCopyAddress: (address: string, event?: PointerEvent | MouseEvent | undefined) => Promise<void>;
    copyTooltip: (tooltipCopyValue?: string) => string;
    getExplorerTranslation: (type: ExplorerType) => 'Polkadot' | 'SORAScan' | 'Subscan' | '';
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
  Readonly<__VLS_Props> & Readonly<{}>,
  {
    block: string;
    hash: string;
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
