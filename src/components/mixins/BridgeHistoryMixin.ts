import { Component, Mixins } from 'vue-property-decorator';
import { Operation, NetworkFeesObject } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { CodecString } from '@sora-substrate/util';
import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

import router from '@/router';
import { PageNames, ZeroStringValue } from '@/consts';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { state, mutation, action, getter } from '@/store/decorators';

@Component
export default class BridgeHistoryMixin extends Mixins(mixins.LoadingMixin) {
  @getter.bridge.history history!: Record<string, EvmHistory>;

  @state.wallet.settings.networkFees networkFees!: NetworkFeesObject;
  @state.router.prev prevRoute!: Nullable<PageNames>;

  @mutation.bridge.setSoraToEvm setSoraToEvm!: (value: boolean) => void;
  @mutation.bridge.setHistoryPage setHistoryPage!: (historyPage?: number) => void;
  @mutation.bridge.setHistoryId setHistoryId!: (id?: string) => void;
  @mutation.bridge.setInternalHistory setHistory!: FnWithoutArgs;

  @action.bridge.setAssetAddress setAssetAddress!: (address?: string) => Promise<void>;
  @action.bridge.generateHistoryItem generateHistoryItem!: (history?: any) => Promise<EvmHistory>;
  @action.bridge.getHistory getHistory!: AsyncVoidFn;

  getSoraNetworkFee(type: Operation): CodecString {
    return this.isOutgoingType(type) ? this.networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
  }

  isOutgoingType(type: Nullable<string>): boolean {
    return type === Operation.EvmOutgoing;
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
