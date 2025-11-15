import { Vue } from 'vue-property-decorator';
import { Asset } from '@sora-substrate/sdk/build/assets/types';

export default class NftTokenLogo extends Vue {
  readonly asset: Asset;
  readonly nftImage: HTMLImageElement;
  showNftImage: boolean;
  get nftImageUrl(): string;
  handleNftImageLoad(): void;
  hideNftImage(): void;
}
