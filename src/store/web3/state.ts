import { ZeroStringValue } from '@/consts';
import ethersUtil from '@/utils/ethers-util';

function initialState() {
  return {
    evmAddress: ethersUtil.getEvmUserAddress(),
    evmBalance: ZeroStringValue,
    networkType: ethersUtil.getEvmNetworkTypeFromStorage(),
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
