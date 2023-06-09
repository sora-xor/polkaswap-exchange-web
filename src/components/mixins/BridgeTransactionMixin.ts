import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { isOutgoingTransaction } from '@/utils/bridge/common/utils';
import { isUnsignedToPart } from '@/utils/bridge/eth/utils';

import type { IBridgeTransaction } from '@sora-substrate/util';

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

@Component
export default class BridgeTransactionMixin extends Mixins(TranslationMixin) {
  isFailedState(item: Nullable<IBridgeTransaction>): boolean {
    if (!(item && item.transactionState)) return false;
    // ETH
    if (
      [ETH_BRIDGE_STATES.EVM_REJECTED as string, ETH_BRIDGE_STATES.SORA_REJECTED as string].includes(
        item.transactionState
      )
    )
      return true;
    // EVM
    if (item.transactionState === BridgeTxStatus.Failed) return true;
    // OTHER
    return false;
  }

  isSuccessState(item: Nullable<IBridgeTransaction>): boolean {
    if (!item) return false;
    // ETH
    if (
      item.transactionState ===
      (isOutgoingTransaction(item) ? ETH_BRIDGE_STATES.EVM_COMMITED : ETH_BRIDGE_STATES.SORA_COMMITED)
    )
      return true;
    // EVM
    if (item.transactionState === BridgeTxStatus.Done) return true;
    // OTHER
    return false;
  }

  isWaitingForAction(item: Nullable<IBridgeTransaction>): boolean {
    if (!item) return false;
    // ETH
    return item.transactionState === ETH_BRIDGE_STATES.EVM_REJECTED && isUnsignedToPart(item);
  }

  formatDatetime(item: Nullable<IBridgeTransaction>): string {
    return this.formatDate(item?.startTime ?? Date.now());
  }
}
