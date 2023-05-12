import { Component, Mixins } from 'vue-property-decorator';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { EvmTxStatus } from '@sora-substrate/util/build/evm/consts';

import { isUnsignedToPart } from '@/utils/bridge/eth/utils';
import { isOutgoingTransaction } from '@/utils/bridge/common/utils';

import type { IBridgeTransaction } from '@/utils/bridge/common/types';

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

@Component
export default class BridgeTransactionMixin extends Mixins() {
  isFailedState(item: Nullable<IBridgeTransaction>): boolean {
    if (!item) return false;
    // ETH
    if ([ETH_BRIDGE_STATES.EVM_REJECTED, ETH_BRIDGE_STATES.SORA_REJECTED].includes(item.transactionState as any))
      return true;
    // EVM
    if (item.transactionState === EvmTxStatus.Failed) return true;
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
    if (item.transactionState === EvmTxStatus.Done) return true;
    // OTHER
    return false;
  }

  isWaitingForAction(item: Nullable<IBridgeTransaction>): boolean {
    if (!item) return false;
    // ETH
    return item.transactionState === ETH_BRIDGE_STATES.EVM_REJECTED && isUnsignedToPart(item);
  }
}
