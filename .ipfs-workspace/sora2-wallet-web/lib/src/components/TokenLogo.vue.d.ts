import { type CSSProperties } from 'vue';
import { LogoSize } from '@/consts';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
type __VLS_Props = {
  tokenSymbol?: string;
  token?: Nullable<AccountAsset | Asset>;
  size?: LogoSize;
  withClickableLogo?: boolean;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {
    iconStyles: import('vue').ComputedRef<CSSProperties>;
    iconClasses: import('vue').ComputedRef<string[]>;
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
    token: Asset | AccountAsset | null;
    tokenSymbol: string;
    size: LogoSize;
    withClickableLogo: boolean;
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
