import type { BridgeHistory } from '@sora-substrate/util';

import type { Bridge } from '@/utils/bridge/common/classes';
import type { GetBridgeHistoryInstance, IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import type { EthBridgeHistory } from '@/utils/bridge/eth/history';
import type { EthBridgeReducer } from '@/utils/bridge/eth/classes/reducers';

interface EthBridgeConstructorOptions extends IBridgeConstructorOptions<BridgeHistory, EthBridgeReducer> {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
}

export type EthBridge = Bridge<BridgeHistory, EthBridgeReducer, EthBridgeConstructorOptions>;
