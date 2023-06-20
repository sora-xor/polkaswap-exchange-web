import { XOR } from '@sora-substrate/util/build/assets/consts';

import type { RouteAssetsState } from './types';

function initialState(): RouteAssetsState {
  return {
    recipients: [],
    file: null,
    subscriptions: [],
    enabledAssetsSubscription: null,
    enabledAssets: {
      tbc: [],
      xst: {},
      lockedSources: [],
    },
    processingState: {
      currentStageIndex: 0,
      inputToken: XOR,
    },
  };
}

const state = initialState();

export default state;
