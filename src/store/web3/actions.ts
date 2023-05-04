import { ethers } from 'ethers';
import { defineActions } from 'direct-vuex';

import { web3ActionContext } from '@/store/web3';
import ethersUtil, { ContractNetwork, Contract } from '@/utils/ethers-util';
import { BridgeType, KnownEthBridgeAsset, OtherContractType } from '@/consts/evm';

import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';
import type { Provider } from '@/utils/ethers-util';
import type { EthBridgeSettings } from './types';

const actions = defineActions({
  async connectExternalAccount(context, provider: Provider): Promise<void> {
    const { commit } = web3ActionContext(context);
    const address = await ethersUtil.onConnect({ provider });
    commit.setEvmAddress(address);
  },

  async connectEvmNetwork(context, networkHex?: string): Promise<void> {
    const { commit } = web3ActionContext(context);
    const evmNetwork = networkHex ? ethersUtil.hexToNumber(networkHex) : await ethersUtil.getEvmNetworkId();
    commit.setEvmNetwork(evmNetwork);
  },

  async selectEvmNetwork(context, evmNetwork: EvmNetwork): Promise<void> {
    const { commit, getters, state } = web3ActionContext(context);
    commit.setSelectedEvmNetwork(evmNetwork);

    const { selectedEvmNetwork: selected } = getters;
    const { evmNetwork: connectedId } = state;

    // if connected network is not equal to selected, request for provider to change network
    if (selected && selected.id !== connectedId) {
      await ethersUtil.switchOrAddChain(selected);
    }
  },

  async restoreSelectedEvmNetwork(context): Promise<void> {
    const { commit, getters } = web3ActionContext(context);

    if (getters.selectedEvmNetwork) return;

    const selectedEvmNetworkId =
      ethersUtil.getSelectedEvmNetwork() || getters.availableNetworks[BridgeType.ETH]?.[0]?.id;

    if (selectedEvmNetworkId) {
      commit.setSelectedEvmNetwork(selectedEvmNetworkId);
    }
  },

  /**
   * Restore selected by user network type (Hashi, EVM, Substrate)
   */
  async restoreNetworkType(context): Promise<void> {
    const { commit, state } = web3ActionContext(context);

    if (state.networkType) return;

    const networkType = ethersUtil.getSelectedBridgeType() ?? BridgeType.ETH;

    commit.setNetworkType(networkType);
  },

  async getEvmTokenAddressByAssetId(context, soraAssetId: string): Promise<string> {
    const { getters } = web3ActionContext(context);
    try {
      if (!soraAssetId) {
        return '';
      }
      const contractAbi = getters.contractAbi(KnownEthBridgeAsset.Other)[OtherContractType.Bridge].abi;
      const contractAddress = getters.contractAddress(KnownEthBridgeAsset.Other);
      if (!contractAddress || !contractAbi) {
        console.error('Contract address/abi is not found');
        return '';
      }
      const ethersInstance = await ethersUtil.getEthersInstance();
      const contractInstance = new ethers.Contract(contractAddress, contractAbi, ethersInstance.getSigner());
      const methodArgs = [soraAssetId];
      const externalAddress = await contractInstance._sidechainTokens(...methodArgs);
      return externalAddress;
    } catch (error) {
      console.error(error);
      return '';
    }
  },

  async setEthBridgeSettings(context, settings: EthBridgeSettings): Promise<void> {
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

    const contracts = {
      XOR: INTERNAL,
      VAL: INTERNAL,
      OTHER: { BRIDGE, ERC20 },
    };

    const { evmNetwork, address } = settings;

    commit.setEthBridgeSettings({ evmNetwork, address, contracts });
  },
});

export default actions;
