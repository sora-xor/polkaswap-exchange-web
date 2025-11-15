import { Vue } from 'vue-property-decorator';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';
export default class NftTokenLogo extends Vue {
  readonly asset: Asset;
  readonly nftImage: HTMLImageElement;
  showNftImage: boolean;
  get nftImageUrl(): string;
  handleNftImageLoad(): void;
  hideNftImage(): void;
}
declare const __VLS_export: import('vue').DefineComponent<
  {},
  {},
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  import('vue').PublicProps,
  Readonly<{}> & Readonly<{}>,
  {},
  {},
  {},
  {},
  string,
  import('vue').ComponentProvideOptions,
  true,
  {},
  any
>;
declare const _default: typeof __VLS_export;
export default _default;
