import type { MSTData } from '@/types/mst';
type __VLS_Props = {
  visible?: boolean;
  mstData?: MSTData;
  threshold?: number;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {},
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {} & {
    back: () => any;
    close: () => any;
    'update:visible': (value: boolean) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      onBack?: (() => any) | undefined;
      onClose?: (() => any) | undefined;
      'onUpdate:visible'?: ((value: boolean) => any) | undefined;
    }>,
  {
    threshold: number;
    visible: boolean;
    mstData: MSTData;
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
