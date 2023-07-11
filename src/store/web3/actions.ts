import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';

import { KnownEthBridgeAsset, SmartContracts, SmartContractType } from '@/consts/evm';
import { web3ActionContext } from '@/store/web3';
import { subConnector } from '@/utils/bridge/sub/classes/adapter';
import ethersUtil from '@/utils/ethers-util';
import type { Provider } from '@/utils/ethers-util';

import type { SubNetworkApps } from './types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import type { ActionContext } from 'vuex';

async function connectEvmNetwork(context: ActionContext<any, any>, networkHex?: string): Promise<void> {
  const { commit } = web3ActionContext(context);
  const evmNetwork = networkHex ? ethersUtil.hexToNumber(networkHex) : await ethersUtil.getEvmNetworkId();
  commit.setProvidedEvmNetwork(evmNetwork);
}

async function connectSubNetwork(context: ActionContext<any, any>): Promise<void> {
  const { getters } = web3ActionContext(context);
  const subNetwork = getters.selectedNetwork;

  if (!subNetwork) return;

  await subConnector.open(subNetwork.id as SubNetwork);
}

const actions = defineActions({
  async connectEvmAccount(context, provider: Provider): Promise<void> {
    const { commit } = web3ActionContext(context);
    const address = await ethersUtil.onConnect({ provider });
    commit.setEvmAddress(address);
  },

  async connectSubAccount(context, address: string): Promise<void> {
    const { commit, rootDispatch } = web3ActionContext(context);
    commit.setSubAddress(address);

    await rootDispatch.bridge.updateExternalBalance();
  },

  async connectExternalNetwork(context, network?: string): Promise<void> {
    const { dispatch, state, rootDispatch } = web3ActionContext(context);

    await dispatch.disconnectExternalNetwork();

    if (state.networkType === BridgeNetworkType.Sub) {
      await connectSubNetwork(context);
    } else {
      await connectEvmNetwork(context, network);
    }

    await Promise.all([rootDispatch.assets.updateRegisteredAssets(), rootDispatch.bridge.updateBalancesAndFees()]);
  },

  async disconnectExternalNetwork(context): Promise<void> {
    const { commit } = web3ActionContext(context);

    await subConnector.stop();

    commit.resetProvidedEvmNetwork();
  },

  async selectExternalNetwork(context, network: BridgeNetworkId): Promise<void> {
    const { commit, dispatch } = web3ActionContext(context);
    commit.setSelectedNetwork(network);
    await dispatch.updateNetworkProvided();
  },

  async updateNetworkProvided(context): Promise<void> {
    const { dispatch, getters, state } = web3ActionContext(context);
    const { selectedNetwork } = getters;
    const { networkType } = state;

    if (!selectedNetwork) return;

    if (networkType !== BridgeNetworkType.Sub) {
      await ethersUtil.switchOrAddChain(selectedNetwork);
    }

    await dispatch.connectExternalNetwork();
  },

  async getSupportedApps(context): Promise<void> {
    const { commit } = web3ActionContext(context);
    const supportedApps = await api.bridgeProxy.getListApps();
    commit.setSupportedApps(supportedApps);
  },

  setSubNetworkApps(context, apps: SubNetworkApps): void {
    const { commit } = web3ActionContext(context);
    // update apps in store
    commit.setSubNetworkApps(apps);
    // update endpoints in subConnector
    Object.entries(apps).forEach(([network, endpoint]) => {
      subConnector.adapters[network]?.setEndpoint(endpoint);
    });
  },

  /**
   * Restore selected by user network & network type (EVMLegacy, EVM, Sub)
   */
  async restoreSelectedNetwork(context): Promise<void> {
    const { commit, state, getters } = web3ActionContext(context);

    const [type, id] = [ethersUtil.getSelectedBridgeType(), ethersUtil.getSelectedNetwork()];

    if (type && id) {
      const networkData = getters.availableNetworks[type]?.[id];

      if (!!networkData && !networkData.disabled) {
        commit.setNetworkType(type);
        commit.setSelectedNetwork(id);
        return;
      }
    }

    commit.setNetworkType(BridgeNetworkType.EvmLegacy);
    commit.setSelectedNetwork(state.ethBridgeEvmNetwork);
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
        throw new Error('Contract address/abi is not found');
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
