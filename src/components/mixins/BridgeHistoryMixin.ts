import { Component, Mixins } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { Operation, NetworkFeesObject } from '@sora-substrate/util';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import router from '@/router';
import { PageNames, ZeroStringValue } from '@/consts';
import { bridgeApi } from '@/utils/bridge';

import type { BridgeHistory, CodecString } from '@sora-substrate/util';

const namespace = 'bridge';

@Component
export default class BridgeHistoryMixin extends Mixins(mixins.LoadingMixin) {
  @Getter networkFees!: NetworkFeesObject;
  @Getter('prev', { namespace: 'router' }) prevRoute!: PageNames;
  @Getter('history', { namespace }) history!: Array<BridgeHistory>;

  @Action('getHistory', { namespace }) getHistory!: AsyncVoidFn;
  @Action('generateHistoryItem', { namespace }) generateHistoryItem!: (history?: any) => Promise<BridgeHistory>;
  @Action('setHistoryItem', { namespace }) setHistoryItem!: (id: string) => Promise<void>;

  getSoraNetworkFee(type: Operation): CodecString {
    return this.isOutgoingType(type) ? this.networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
  }

  isOutgoingType(type: Nullable<string>): boolean {
    return type !== Operation.EthBridgeIncoming;
  }

  async showHistory(id: string): Promise<void> {
    await this.withLoading(async () => {
      const tx = bridgeApi.getHistory(id) as BridgeHistory;

      if (!tx || !tx.id) {
        this.handleBack();
      } else {
        await this.setHistoryItem(tx.id);

        this.navigateToBridgeTransaction();
      }
    });
  }

  navigateToBridgeTransaction(): void {
    router.push({ name: PageNames.BridgeTransaction });
  }

  handleBack(): void {
    router.push({ name: this.prevRoute });
  }
}
