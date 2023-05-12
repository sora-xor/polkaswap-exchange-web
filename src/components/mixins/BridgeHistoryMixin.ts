import { Component, Mixins } from 'vue-property-decorator';
import { Operation, NetworkFeesObject } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import router from '@/router';
import { PageNames } from '@/consts';
import { state, mutation, action, getter } from '@/store/decorators';
import { isOutgoingTransaction } from '@/utils/bridge/common/utils';

import type { IBridgeTransaction } from '@/utils/bridge/common/types';

@Component
export default class BridgeHistoryMixin<T extends IBridgeTransaction> extends Mixins(mixins.LoadingMixin) {
  @getter.bridge.history history!: Record<string, T>;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;
  @state.router.prev prevRoute!: Nullable<PageNames>;
  @state.bridge.historyLoading historyLoading!: boolean;

  @mutation.bridge.setSoraToEvm setSoraToEvm!: (value: boolean) => void;
  @mutation.bridge.setHistoryPage setHistoryPage!: (historyPage?: number) => void;
  @mutation.bridge.setHistoryId setHistoryId!: (id?: string) => void;

  @action.bridge.setAssetAddress setAssetAddress!: (address?: string) => Promise<void>;
  @action.bridge.generateHistoryItem generateHistoryItem!: (history?: any) => Promise<T>;
  @action.bridge.updateInternalHistory updateInternalHistory!: FnWithoutArgs;
  @action.bridge.updateExternalHistory updateExternalHistory!: (clearHistory?: boolean) => Promise<void>;

  isOutgoingType(type: Operation): boolean {
    return isOutgoingTransaction({ type } as IBridgeTransaction);
  }

  async showHistory(id?: string): Promise<void> {
    if (!id) {
      this.handleBack();
    }
    await this.withLoading(async () => {
      const tx = this.history[id as string];

      // to display actual fees in BridgeTransaction
      this.setSoraToEvm(this.isOutgoingType(tx.type));
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
