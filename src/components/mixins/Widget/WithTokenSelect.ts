import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

@Component
export default class WidgetWithTokenSelect extends Mixins(mixins.LoadingMixin) {
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
