import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';

import { KnownEthBridgeAsset, SmartContracts, SmartContractType } from '@/consts/evm';
import { web3ActionContext } from '@/store/web3';
import ethersUtil from '@/utils/ethers-util';
import type { Provider } from '@/utils/ethers-util';

import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import type { ActionContext } from 'vuex';

async function connectEvmNetwork(context: ActionContext<any, any>, networkHex?: string): Promise<void> {
  const { commit } = web3ActionContext(context);
  const evmNetwork = networkHex ? ethersUtil.hexToNumber(networkHex) : await ethersUtil.getEvmNetworkId();
  commit.setProvidedNetwork(evmNetwork);
}

async function connectSubNetwork(context: ActionContext<any, any>, network?: SubNetwork): Promise<void> {
  // [TODO] connect to substrate network
  // this code just takes network from storage
  const { commit } = web3ActionContext(context);
  const provided = network || ethersUtil.getSelectedNetwork();

  if (provided) {
    commit.setProvidedNetwork(provided);
  }
}

const actions = defineActions({
  async connectEvmAccount(context, provider: Provider): Promise<void> {
    const { commit } = web3ActionContext(context);
    const address = await ethersUtil.onConnect({ provider });
    commit.setEvmAddress(address);
  },

  async connectExternalNetwork(context, network?: string): Promise<void> {
    const { state, rootCommit } = web3ActionContext(context);

    if (state.networkType === BridgeNetworkType.Sub) {
      await connectSubNetwork(context, network as SubNetwork);
    } else {
      await connectEvmNetwork(context, network);
    }

    // reset bridge direction & history
    rootCommit.bridge.setSoraToEvm(true);
    rootCommit.bridge.setExternalHistory({});
  },

  async selectExternalNetwork(context, network: BridgeNetworkId): Promise<void> {
    const { commit, dispatch } = web3ActionContext(context);
    commit.setSelectedNetwork(network);
    await dispatch.updateNetworkProvided();
  },

  async updateNetworkProvided(context): Promise<void> {
    const { dispatch, getters, state } = web3ActionContext(context);
    const { selectedNetwork: selected } = getters;
    const { networkType } = state;

    if (!selected) return;

    if (networkType !== BridgeNetworkType.Sub) {
      await ethersUtil.switchOrAddChain(selected);
    }

    await dispatch.connectExternalNetwork();
  },

  async getSupportedApps(context): Promise<void> {
    const { commit } = web3ActionContext(context);
    const supportedApps = await api.bridgeProxy.getListApps();
    commit.setSupportedApps(supportedApps);
  },

  async restoreSelectedEvmNetwork(context): Promise<void> {
    const { commit, getters } = web3ActionContext(context);

    if (getters.selectedNetwork) return;

    const selectedEvmNetworkId =
      ethersUtil.getSelectedNetwork() || getters.availableNetworks[BridgeNetworkType.EvmLegacy]?.[0]?.data?.id;

    if (selectedEvmNetworkId) {
      commit.setSelectedNetwork(selectedEvmNetworkId);
    }
  },

  /**
   * Restore selected by user network type (Hashi, EVM, Substrate)
   */
  async restoreNetworkType(context): Promise<void> {
    const { commit, state } = web3ActionContext(context);

    if (state.networkType) return;

    const networkType = ethersUtil.getSelectedBridgeType() ?? BridgeNetworkType.EvmLegacy;

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
