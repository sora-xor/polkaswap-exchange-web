import { NetworkFeesObject } from '@sora-substrate/sdk';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { PageNames } from '@/consts';
import router from '@/router';
import { state, mutation, action, getter } from '@/store/decorators';
import { isOutgoingTransaction } from '@/utils/bridge/common/utils';

import type { IBridgeTransaction } from '@sora-substrate/sdk';

@Component
export default class BridgeHistoryMixin<T extends IBridgeTransaction> extends Mixins(mixins.LoadingMixin) {
  @getter.bridge.history history!: Record<string, T>;
  @getter.bridge.networkHistoryLoading networkHistoryLoading!: boolean;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;
  @state.router.prev prevRoute!: Nullable<PageNames>;

  @mutation.bridge.setSoraToEvm setSoraToEvm!: (value: boolean) => void;
  @mutation.bridge.setHistoryPage setHistoryPage!: (historyPage?: number) => void;
  @mutation.bridge.setHistoryId setHistoryId!: (id?: string) => void;

  @action.bridge.setAssetAddress setAssetAddress!: (address?: string) => Promise<void>;
  @action.bridge.generateHistoryItem generateHistoryItem!: (history?: any) => Promise<T>;
  @action.bridge.updateInternalHistory updateInternalHistory!: FnWithoutArgs;
  @action.bridge.updateExternalHistory updateExternalHistory!: (clearHistory?: boolean) => Promise<void>;

  async showHistory(id?: string): Promise<void> {
    if (!id) {
      this.handleBack();
    }
    await this.withLoading(async () => {
      const tx = this.history[id as string];

      // to display actual fees in BridgeTransaction
      this.setSoraToEvm(isOutgoingTransaction(tx));
      await this.setAssetAddress(tx.assetAddress);

      this.setHistoryId(tx.id);

      this.navigateToBridgeTransaction();
    });
  }

  navigateToBridgeTransaction(): void {
    router.push({ name: PageNames.BridgeTransaction });
  }

  handleBack(): void {
    router.push({ name: this.prevRoute as string | undefined });
  }
}
