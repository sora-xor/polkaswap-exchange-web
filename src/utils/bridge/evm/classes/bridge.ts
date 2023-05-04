import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

import { Bridge } from '@/utils/bridge/common/classes';

import type { RemoveTransactionByHash, IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import type { EvmBridgeReducer } from '@/utils/bridge/evm/classes/reducers';

interface EvmBridgeConstructorOptions extends IBridgeConstructorOptions<EvmHistory, EvmBridgeReducer> {
  removeTransactionByHash: RemoveTransactionByHash<EvmHistory>;
}

export class EvmBridge extends Bridge<EvmHistory, EvmBridgeReducer, EvmBridgeConstructorOptions> {}
