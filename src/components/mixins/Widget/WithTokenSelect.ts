import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins as walletMixins } from '@wallet';
import { Options, Prop, mixins as vueMixins } from 'vue-property-decorator';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

@Options({})
export default class WidgetWithTokenSelect extends vueMixins(walletMixins.LoadingMixin) {
  @Prop({ type: Object }) predefinedToken!: Nullable<Asset>;

  public token = XOR;

  public showSelectTokenDialog = false;

  get selectedToken(): Asset {
    return this.predefinedToken || this.token;
  }

  get areActionsDisabled(): boolean {
    return this.parentLoading || this.loading;
  }

  get selectTokenIcon(): Nullable<string> {
    return !this.areActionsDisabled ? 'chevron-down-rounded-16' : undefined;
  }

  get tokenTabIndex(): number {
    return !this.areActionsDisabled ? 0 : -1;
  }

  public handleSelectToken(): void {
    this.showSelectTokenDialog = true;
  }

  public changeToken(token: Asset): void {
    if (this.selectedToken.address === token.address) return;

    this.token = token;
  }
}
