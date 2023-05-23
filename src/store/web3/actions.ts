import { ethers } from 'ethers';
import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';

import { web3ActionContext } from '@/store/web3';
import ethersUtil from '@/utils/ethers-util';
import { BridgeType, KnownEthBridgeAsset, SmartContracts, SmartContractType } from '@/consts/evm';

import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';
import type { Provider } from '@/utils/ethers-util';

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
    const { commit, dispatch } = web3ActionContext(context);
    commit.setSelectedEvmNetwork(evmNetwork);
    await dispatch.updateEvmNetwork();
  },

  async updateEvmNetwork(context): Promise<void> {
    const { dispatch, getters, state } = web3ActionContext(context);
    const { selectedEvmNetwork: selected } = getters;
    const { evmNetwork: connectedId } = state;

    // if connected network is not equal to selected, request for provider to change network
    if (selected && selected.id !== connectedId) {
      await ethersUtil.switchOrAddChain(selected);
      await dispatch.connectEvmNetwork();
    }
  },

  async getSupportedNetworks(context): Promise<void> {
    const { commit } = web3ActionContext(context);
    const networksIds = await api.evm.getAvailableNetworks();
    commit.setEvmNetworksChain(networksIds);
  },

  async restoreSelectedEvmNetwork(context): Promise<void> {
    const { commit, getters } = web3ActionContext(context);

    if (getters.selectedEvmNetwork) return;

    const selectedEvmNetworkId =
      ethersUtil.getSelectedEvmNetwork() || getters.availableNetworks[BridgeType.ETH]?.[0]?.data?.id;

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
      const contractAbi = SmartContracts[SmartContractType.EthBridge][KnownEthBridgeAsset.Other].abi;
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
});

export default actions;
