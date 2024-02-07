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
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { ActionContext } from 'vuex';

async function connectSubNetwork(context: ActionContext<any, any>): Promise<void> {
  const { getters, commit } = web3ActionContext(context);
  const subNetwork = getters.selectedNetwork;

  if (!subNetwork) return;

  await subBridgeConnector.open(subNetwork.id as SubNetwork);

  const ss58 = subBridgeConnector.network.adapter.api.registry.chainSS58;

  if (ss58 !== undefined) commit.setSubSS58(ss58);
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

async function autoselectBridgeAsset(context: ActionContext<any, any>): Promise<void> {
  const { rootGetters, rootDispatch } = web3ActionContext(context);

  const assetAddress = rootGetters.bridge.autoselectedAssetAddress;

  if (assetAddress) {
    await rootDispatch.bridge.setAssetAddress(assetAddress);
  }
}

async function autoselectSubAddress(context: ActionContext<any, any>): Promise<void> {
  const { commit, rootState } = web3ActionContext(context);
  const { address, name } = rootState.wallet.account;

  if (address) {
    commit.setSubAddress({ address, name });
  } else {
    commit.setSubAddress({ address: '', name: '' });
  }
}

async function getRegisteredAssets(context: ActionContext<any, any>): Promise<void> {
  const { rootDispatch } = web3ActionContext(context);

  await rootDispatch.assets.getRegisteredAssets();
  await autoselectBridgeAsset(context);
}

const actions = defineActions({
  async selectEvmProvider(context, provider: Provider): Promise<void> {
    const { commit, state } = web3ActionContext(context);
    try {
      commit.setEvmProviderLoading(provider);
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
    const { commit, state } = web3ActionContext(context);
    const provider = state.evmProvider;
    // reset store
    commit.resetEvmAddress();
    commit.resetEvmProvider();
    commit.resetEvmProviderNetwork();
    commit.resetEvmProviderSubscription();
    // reset connection
    ethersUtil.disconnectEvmProvider(provider);
  },

  async disconnectExternalNetwork(_context): Promise<void> {
    // SUB
    await subBridgeConnector.stop();
  },

  async selectExternalNetwork(context, { id, type }: { id: BridgeNetworkId; type: BridgeNetworkType }): Promise<void> {
    const { commit, dispatch } = web3ActionContext(context);

    await dispatch.disconnectExternalNetwork();

    commit.setNetworkType(type);
    commit.setSelectedNetwork(id);

    getRegisteredAssets(context);

    if (type === BridgeNetworkType.Sub) {
      autoselectSubAddress(context);
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
    const { commit, getters } = web3ActionContext(context);
    // update apps in store
    commit.setSubNetworkApps(apps);

    const networks = getters.availableNetworks[BridgeNetworkType.Sub];
    const endpoints = Object.entries(networks).reduce((acc, [key, value]) => {
      if (!value || value.disabled) return acc;
      const endpoints = value.data.endpointUrls;
      return { ...acc, [key]: endpoints };
    }, {});

    // update endpoints in SubNetworksConnector class
    SubNetworksConnector.endpoints = endpoints;
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

  /**
   * Only for assets, created in SORA network!
   * "Thischain" for SORA, "Sidechain" for EVM
   */
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
      // Not (wrong) registered Sora asset on bridge contract return '0' address (like native token)
      if (ethersUtil.isNativeEvmTokenAddress(externalAddress)) {
        throw new Error('Asset is not registered');
      }
      return externalAddress;
    } catch (error) {
      console.error(soraAssetId, error);
      return '';
    }
  },
});

export default actions;
