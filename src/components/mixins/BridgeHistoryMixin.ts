import { Component, Mixins } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { Operation, CodecString, NetworkFeesObject, BridgeHistory } from '@sora-substrate/util';

import LoadingMixin from '@/components/mixins/LoadingMixin';

import router from '@/router';
import { PageNames, ZeroStringValue } from '@/consts';
import { bridgeApi } from '@/utils/bridge';
import { STATES } from '@/utils/fsm';

const namespace = 'bridge';

@Component
export default class BridgeHistoryMixin extends Mixins(LoadingMixin) {
  @Getter networkFees!: NetworkFeesObject;
  @Getter('evmNetworkFee', { namespace }) evmNetworkFee!: CodecString;
  @Getter('history', { namespace }) bridgeHistory!: Array<BridgeHistory>;

  @Action('getHistory', { namespace }) getHistory!: AsyncVoidFn;
  @Action('generateHistoryItem', { namespace }) generateHistoryItem!: (history: any) => Promise<BridgeHistory>;

  @Action('getEvmNetworkFee', { namespace }) getEvmNetworkFee!: AsyncVoidFn;
  @Action('setAmount', { namespace }) setAmount!: (amount: string) => Promise<void>;
  @Action('setAssetAddress', { namespace }) setAssetAddress!: (address?: string) => Promise<void>;
  @Action('setSoraToEvm', { namespace }) setSoraToEvm!: (value: boolean) => Promise<void>;
  @Action('setTransactionConfirm', { namespace }) setTransactionConfirm!: (value: boolean) => Promise<void>;
  @Action('setSoraTransactionHash', { namespace }) setSoraTransactionHash!: (
    soraTransactionHash: string
  ) => Promise<void>;

  @Action('setEvmTransactionHash', { namespace }) setEvmTransactionHash!: (evmTransactionHash: string) => Promise<void>;
  @Action('setSoraTransactionDate', { namespace }) setSoraTransactionDate!: (
    soraTransactionDate: string
  ) => Promise<void>;

  @Action('setEvmTransactionDate', { namespace }) setEvmTransactionDate!: (evmTransactionDate: string) => Promise<void>;
  @Action('setEvmNetworkFee', { namespace }) setEvmNetworkFee!: (evmNetworkFee: CodecString) => Promise<void>;
  @Action('setCurrentTransactionState', { namespace }) setCurrentTransactionState!: (state: STATES) => Promise<void>;
  @Action('setTransactionStep', { namespace }) setTransactionStep!: (step: number) => Promise<void>;
  @Action('setHistoryItem', { namespace }) setHistoryItem!: (historyItem: BridgeHistory) => Promise<void>;
  @Action('saveHistory', { namespace }) saveHistory!: (historyItem: BridgeHistory) => Promise<void>;

  getSoraNetworkFee(type: Operation): CodecString {
    return this.isOutgoingType(type) ? this.networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue;
  }

  isOutgoingType(type: Nullable<string>): boolean {
    return type !== Operation.EthBridgeIncoming;
  }

  async showHistory(id: string): Promise<void> {
    await this.withLoading(async () => {
      const tx = bridgeApi.getHistory(id);
      if (!tx) {
        router.push({ name: PageNames.BridgeTransaction });
        return;
      }
      await this.setTransactionConfirm(true);
      await this.setSoraToEvm(this.isOutgoingType(tx.type));
      await this.setAssetAddress(tx.assetAddress);
      await this.setAmount(tx.amount || '0');
      await this.setSoraTransactionHash(tx.hash || '');
      await this.setEvmTransactionHash(tx.ethereumHash || '');
      await this.setSoraTransactionDate(String(tx[this.isOutgoingType(tx.type) ? 'startTime' : 'endTime']));
      await this.setEvmTransactionDate(String(tx[!this.isOutgoingType(tx.type) ? 'startTime' : 'endTime']));

      const soraNetworkFee = +(tx.soraNetworkFee || 0);
      const evmNetworkFee = +(tx.ethereumNetworkFee || 0);

      if (!soraNetworkFee) {
        tx.soraNetworkFee = this.getSoraNetworkFee(tx.type);
      }
      if (!evmNetworkFee) {
        tx.ethereumNetworkFee = this.evmNetworkFee;
        await this.getEvmNetworkFee();
      }
      if (!(soraNetworkFee && evmNetworkFee)) {
        this.saveHistory(tx);
      }
      await this.setEvmNetworkFee(String(evmNetworkFee || this.evmNetworkFee));
      await this.setTransactionStep(tx.transactionStep || 1);
      await this.setCurrentTransactionState(tx.transactionState as STATES);
      await this.setHistoryItem(tx);

      this.navigateToBridgeTransaction();
    });
  }

  navigateToBridgeTransaction(): void {
    router.push({ name: PageNames.BridgeTransaction });
  }
}
