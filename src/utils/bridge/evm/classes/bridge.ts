import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

import type { Bridge } from '@/utils/bridge/common/classes';
import type { RemoveTransactionByHash, IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import type { EvmBridgeReducer } from '@/utils/bridge/evm/classes/reducers';

interface EvmBridgeConstructorOptions extends IBridgeConstructorOptions<EvmHistory, EvmBridgeReducer> {
  removeTransactionByHash: RemoveTransactionByHash<EvmHistory>;
}

export type EvmBridge = Bridge<EvmHistory, EvmBridgeReducer, EvmBridgeConstructorOptions>;
