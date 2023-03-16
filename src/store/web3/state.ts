import { BridgeNetworks } from '@sora-substrate/util';

import { ZeroStringValue } from '@/consts';
import ethersUtil from '@/utils/ethers-util';
import type { Web3State } from './types';

export function initialState(): Web3State {
  return {
    evmAddress: ethersUtil.getEvmUserAddress(),
    evmBalance: ZeroStringValue,
    networkType: null,
    subNetworks: [],
    evmNetwork: BridgeNetworks.ETH_NETWORK_ID,
    contractAddress: {
      [BridgeNetworks.ETH_NETWORK_ID]: {
        XOR: '',
        VAL: '',
        OTHER: '',
      },
      [BridgeNetworks.ENERGY_NETWORK_ID]: {
        OTHER: '',
      },
    },
    smartContracts: {
      [BridgeNetworks.ETH_NETWORK_ID]: {
        XOR: '',
        VAL: '',
        OTHER: '',
      },
      [BridgeNetworks.ENERGY_NETWORK_ID]: {
        OTHER: '',
      },
    },
  };
}

const state = initialState();

export default state;
