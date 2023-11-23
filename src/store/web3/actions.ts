import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';

import { KnownEthBridgeAsset, SmartContracts, SmartContractType } from '@/consts/evm';
import { web3ActionContext } from '@/store/web3';
import { SubNetworksConnector, subBridgeConnector } from '@/utils/bridge/sub/classes/adapter';
import ethersUtil, { Provider, PROVIDER_ERROR } from '@/utils/ethers-util';

import type { SubNetworkApps } from './types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import type { ActionContext } from 'vuex';

async function connectSubNetwork(context: ActionContext<any, any>): Promise<void> {
  const { getters, commit } = web3ActionContext(context);
  const subNetwork = getters.selectedNetwork;

  if (!subNetwork) return;

  await subBridgeConnector.open(subNetwork.id as SubNetwork);

  const ss58 = subBridgeConnector.network.adapter.api.registry.chainSS58;

  if (ss58) commit.setSubSS58(ss58);
}

async function updateProvidedEvmNetwork(context: ActionContext<any, any>, evmNetworkId?: number): Promise<void> {
  const { commit, rootDispatch } = web3ActionContext(context);
  const evmNetwork = evmNetworkId ?? (await ethersUtil.getEvmNetworkId());

  commit.setProvidedEvmNetwork(evmNetwork);

  await rootDispatch.assets.updateRegisteredAssets();
}

async function subscribeOnEvm(context: ActionContext<any, any>): Promise<void> {
  const { commit, dispatch } = web3ActionContext(context);

  commit.resetEvmProviderSubscription();

  const subscription = await ethersUtil.watchEthereum({
    onAccountChange: (addressList: string[]) => {
      if (addressList.length) {
        commit.setEvmAddress(addressList[0]);
      } else {
        dispatch.resetEvmProviderConnection();
      }
    },
    onNetworkChange: (networkHex: string) => {
      const evmNetwork = ethersUtil.hexToNumber(networkHex);
      updateProvidedEvmNetwork(context, evmNetwork);
    },
    onDisconnect: (error) => {
      // this is just chain switch, it's ok
      if (error?.code === PROVIDER_ERROR.DisconnectedFromChain) {
        return;
      }
      dispatch.resetEvmProviderConnection();
    },
  });

  commit.setEvmProviderSubscription(subscription);
}

const actions = defineActions({
  async selectEvmProvider(context, provider: Provider): Promise<void> {
    const { commit, dispatch, state } = web3ActionContext(context);
    try {
      commit.setEvmProviderLoading(provider);
      // reset prev connection
      dispatch.resetEvmProviderConnection();
      // create new connection
      const address = await ethersUtil.connectEvmProvider(provider, {
        chains: [state.ethBridgeEvmNetwork],
        optionalChains: [...state.evmNetworkApps],
      });
      // if we have address - we are connected
      // if provider not changed - continue
      if (address && provider === state.evmProviderLoading) {
        // set new provider data
        commit.setEvmAddress(address);
        commit.setEvmProvider(provider);
        await updateProvidedEvmNetwork(context);
        await subscribeOnEvm(context);
      }
    } finally {
      commit.setEvmProviderLoading();
    }
  },

  resetEvmProviderConnection(context): void {
    const { commit } = web3ActionContext(context);
    // reset store
    commit.resetEvmAddress();
    commit.resetEvmProvider();
    commit.resetEvmProviderNetwork();
    commit.resetEvmProviderSubscription();
    // reset connection
    ethersUtil.disconnectEvmProvider();
  },

  async disconnectExternalNetwork(context): Promise<void> {
    // SUB
    await subBridgeConnector.stop();
  },

  async selectExternalNetwork(context, { id, type }: { id: BridgeNetworkId; type: BridgeNetworkType }): Promise<void> {
    const { commit, dispatch, rootDispatch } = web3ActionContext(context);

    dispatch.disconnectExternalNetwork();

    commit.setNetworkType(type);
    commit.setSelectedNetwork(id);

    rootDispatch.assets.getRegisteredAssets();

    if (type === BridgeNetworkType.Sub) {
      await connectSubNetwork(context);
    }
  },

  async changeEvmNetworkProvided(context): Promise<void> {
    const { getters, state } = web3ActionContext(context);
    const { selectedNetwork } = getters;
    const { networkType } = state;

    if (selectedNetwork && networkType !== BridgeNetworkType.Sub) {
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
   * Restore selected by user network & network type (Eth, EVM, Sub)
   */
  async restoreSelectedNetwork(context): Promise<void> {
    const { dispatch, state, getters } = web3ActionContext(context);

    const [type, id] = [ethersUtil.getSelectedBridgeType(), ethersUtil.getSelectedNetwork()];

    if (type && id) {
      const networkData = getters.availableNetworks[type]?.[id];

      if (!!networkData && !networkData.disabled) {
        await dispatch.selectExternalNetwork({ id, type });
        return;
      }
    }

    await dispatch.selectExternalNetwork({
      id: state.ethBridgeEvmNetwork,
      type: BridgeNetworkType.Eth,
    });
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
      console.error(soraAssetId, error);
      return '';
    }
  },
});

export default actions;
