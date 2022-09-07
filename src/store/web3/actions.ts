import { defineActions } from 'direct-vuex';
import { BridgeNetworks } from '@sora-substrate/util';
import { ethers } from 'ethers';
import type { ActionContext } from 'vuex';

import { web3ActionContext } from '@/store/web3';
import ethersUtil, {
  Contract,
  ContractNetwork,
  EvmNetworkTypeName,
  KnownBridgeAsset,
  OtherContractType,
  SubNetwork,
} from '@/utils/ethers-util';

import type { Provider } from '@/utils/ethers-util';

async function setEthSmartContracts(context: ActionContext<any, any>, network: SubNetwork): Promise<void> {
  const { commit } = web3ActionContext(context);
  const INTERNAL = await ethersUtil.readSmartContract(ContractNetwork.Ethereum, `${Contract.Internal}/MASTER.json`);
  const BRIDGE = await ethersUtil.readSmartContract(
    ContractNetwork.Ethereum,
    `${Contract.Other}/${OtherContractType.Bridge}.json`
  );
  const ERC20 = await ethersUtil.readSmartContract(
    ContractNetwork.Ethereum,
    `${Contract.Other}/${OtherContractType.ERC20}.json`
  );
  commit.setEthSmartContracts({
    address: {
      XOR: network.CONTRACTS.XOR.MASTER,
      VAL: network.CONTRACTS.VAL.MASTER,
      OTHER: network.CONTRACTS.OTHER.MASTER,
    },
    contracts: {
      XOR: INTERNAL,
      VAL: INTERNAL,
      OTHER: { BRIDGE, ERC20 },
    },
  });
}

async function setEnergySmartContracts(context: ActionContext<any, any>, network: SubNetwork): Promise<void> {
  const { commit } = web3ActionContext(context);
  const BRIDGE = await ethersUtil.readSmartContract(ContractNetwork.Other, `${OtherContractType.Bridge}.json`);
  const ERC20 = await ethersUtil.readSmartContract(ContractNetwork.Other, `${OtherContractType.ERC20}.json`);
  commit.setEnergySmartContracts({
    address: { OTHER: network.CONTRACTS.OTHER.MASTER },
    contracts: { OTHER: { BRIDGE, ERC20 } },
  });
}

const actions = defineActions({
  async connectExternalAccount(context, provider: Provider): Promise<void> {
    const { commit } = web3ActionContext(context);
    const address = await ethersUtil.onConnect({ provider });
    commit.setEvmAddress(address);
  },

  async setEvmNetworkType(context, networkHex?: string): Promise<void> {
    const { commit } = web3ActionContext(context);
    let networkType = '';
    if (!networkHex) {
      networkType = await ethersUtil.getEvmNetworkType();
    } else {
      networkType = EvmNetworkTypeName[networkHex];
    }
    commit.setNetworkType(networkType);
  },

  async setSmartContracts(context, subNetworks: Array<SubNetwork>): Promise<void> {
    for (const network of subNetworks) {
      switch (network.id) {
        case BridgeNetworks.ETH_NETWORK_ID:
          await setEthSmartContracts(context, network);
          break;
        case BridgeNetworks.ENERGY_NETWORK_ID:
          // TODO: [BRIDGE] Reduce file size
          // await setEnergySmartContracts(context, network);
          break;
      }
    }
  },

  // TODO [EVM]
  async getEvmTokenAddressByAssetId(context, soraAssetId: string): Promise<string> {
    const { getters } = web3ActionContext(context);
    try {
      if (!soraAssetId) {
        return '';
      }
      const ethersInstance = await ethersUtil.getEthersInstance();
      const contractAbi = getters.contractAbi(KnownBridgeAsset.Other)[OtherContractType.Bridge].abi;
      const contractAddress = getters.contractAddress(KnownBridgeAsset.Other);
      if (!contractAddress || !contractAbi) {
        console.error('Contract address/abi is not found');
        return '';
      }
      const contractInstance = new ethers.Contract(contractAddress, contractAbi, ethersInstance.getSigner());
      const methodArgs = [soraAssetId];
      const externalAddress = await contractInstance._sidechainTokens(...methodArgs);
      return externalAddress;
    } catch (error) {
      console.error(error);
      return '';
    }
  },
});

export default actions;
