import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';

import { KnownEthBridgeAsset, SmartContracts, SmartContractType } from '@/consts/evm';
import { web3ActionContext } from '@/store/web3';
import { SubNetworksConnector, subBridgeConnector } from '@/utils/bridge/sub/classes/adapter';
import ethersUtil from '@/utils/ethers-util';
import type { Provider } from '@/utils/ethers-util';

import type { SubNetworkApps } from './types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';

const actions = defineActions({
  async connectEvmNetwork(context, networkHex?: string): Promise<void> {
    const { commit } = web3ActionContext(context);
    const evmNetwork = networkHex ? ethersUtil.hexToNumber(networkHex) : await ethersUtil.getEvmNetworkId();
    commit.setProvidedEvmNetwork(evmNetwork);
  },

  async connectSubNetwork(context): Promise<void> {
    const { getters } = web3ActionContext(context);
    const subNetwork = getters.selectedNetwork;

    if (!subNetwork) return;

    await subBridgeConnector.open(subNetwork.id as SubNetwork);
  },

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

    await Promise.all([
      rootDispatch.bridge.setAssetAddress(),
      rootDispatch.bridge.setSendedAmount(),
      rootDispatch.assets.updateRegisteredAssets(),
    ]);

    if (state.networkType === BridgeNetworkType.Sub) {
      await dispatch.connectSubNetwork();
    } else {
      await dispatch.connectEvmNetwork(network);
    }
  },

  async disconnectExternalNetwork(context): Promise<void> {
    const { commit } = web3ActionContext(context);

    await subBridgeConnector.stop();

    commit.resetProvidedEvmNetwork();
  },

  async selectExternalNetwork(context, network: BridgeNetworkId): Promise<void> {
    const { commit, dispatch } = web3ActionContext(context);
    commit.setSelectedNetwork(network);
    await dispatch.connectExternalNetwork();
  },

  async updateNetworkProvided(context): Promise<void> {
    const { getters, state } = web3ActionContext(context);
    const { selectedNetwork } = getters;
    const { networkType } = state;

    if (!selectedNetwork) return;

    if (networkType !== BridgeNetworkType.Sub) {
      await ethersUtil.switchOrAddChain(selectedNetwork);
    }
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
    // update endpoints in SubNetworksConnector class
    SubNetworksConnector.endpoints = apps;
  },

  /**
   * Restore selected by user network & network type (EVMLegacy, EVM, Sub)
   */
  async restoreSelectedNetwork(context): Promise<void> {
    const { commit, dispatch, state, getters } = web3ActionContext(context);

    const [type, id] = [ethersUtil.getSelectedBridgeType(), ethersUtil.getSelectedNetwork()];
    const networkData = type && id ? getters.availableNetworks[type]?.[id] : null;

    if (!!networkData && !networkData.disabled) {
      commit.setNetworkType(type as BridgeNetworkType);
      commit.setSelectedNetwork(id as BridgeNetworkId);
    } else {
      commit.setNetworkType(BridgeNetworkType.EvmLegacy);
      commit.setSelectedNetwork(state.ethBridgeEvmNetwork);
    }

    await dispatch.connectExternalNetwork();
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
      const signer = await ethersUtil.getSigner();
      const contractInstance = new ethers.Contract(contractAddress, contractAbi, signer);
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
