import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

import { BridgeTransactionStateHandler } from '@/utils/bridge/common/classes';

export class EvmBridgeOutgoingReducer extends BridgeTransactionStateHandler<EvmHistory> {}
export class EvmBridgeIncomingReducer extends BridgeTransactionStateHandler<EvmHistory> {}
