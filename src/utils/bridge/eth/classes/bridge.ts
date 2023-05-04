import type { BridgeHistory } from '@sora-substrate/util';

import { Bridge } from '@/utils/bridge/common/classes';

import type { EthBridgeHistory } from '@/utils/bridge/eth/history';
import type { GetBridgeHistoryInstance, IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import type { EthBridgeReducer } from '@/utils/bridge/eth/classes/reducers';

interface EthBridgeConstructorOptions extends IBridgeConstructorOptions<BridgeHistory, EthBridgeReducer> {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
}

export class EthBridge extends Bridge<BridgeHistory, EthBridgeReducer, EthBridgeConstructorOptions> {}
