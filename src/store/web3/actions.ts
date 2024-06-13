import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { ethers } from 'ethers';

import { KnownEthBridgeAsset, SmartContracts, SmartContractType } from '@/consts/evm';
import { web3ActionContext } from '@/store/web3';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import ethersUtil, { Provider, PROVIDER_ERROR } from '@/utils/ethers-util';

import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { ActionContext } from 'vuex';

async function connectNetworkType(context: ActionContext<any, any>): Promise<void> {
  const { state } = web3ActionContext(context);

  if (state.networkType === BridgeNetworkType.Sub) {
    autoselectSubAddress(context);
    await connectSubNetwork(context);
  }
}

async function connectSubNetwork(context: ActionContext<any, any>): Promise<void> {
  const { getters, rootState } = web3ActionContext(context);
  const subNetwork = getters.selectedNetwork;

  if (!subNetwork) return;

  await rootState.bridge.subBridgeConnector.open(subNetwork.id as SubNetwork);
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

  async disconnectExternalNetwork(context): Promise<void> {
    const { rootState } = web3ActionContext(context);
    // SUB
    await rootState.bridge.subBridgeConnector.stop();
  },

  async selectExternalNetwork(context, { id, type }: { id: BridgeNetworkId; type: BridgeNetworkType }): Promise<void> {
    const { commit, dispatch, rootDispatch } = web3ActionContext(context);

    await dispatch.disconnectExternalNetwork();

    commit.setNetworkType(type);
    commit.setSelectedNetwork(id);

    await Promise.allSettled([rootDispatch.assets.getRegisteredAssets(), connectNetworkType(context)]);

    await autoselectBridgeAsset(context);
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
    const { commit, getters } = web3ActionContext(context);
    // [TODO] remove this production mock after nodes update
    const supportedApps = {
      [BridgeNetworkType.Eth]: {},
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: [
        SubNetworkId.Kusama,
        SubNetworkId.KusamaSora,
        SubNetworkId.Polkadot,
        SubNetworkId.PolkadotAstar,
        SubNetworkId.PolkadotAcala,
        SubNetworkId.PolkadotSora,
        SubNetworkId.Liberland,
      ],
    };
    // [TODO] uncomment
    // const supportedApps = await api.bridgeProxy.getListApps();

    commit.setSupportedApps(supportedApps as any);

    const networks = getters.availableNetworks[BridgeNetworkType.Sub];

    const nodes = Object.entries(networks).reduce((acc, [key, value]) => {
      if (!value?.data?.nodes) return acc;
      return { ...acc, [key]: value.data.nodes };
    }, {});

    // update nodes in SubNetworksConnector class
    SubNetworksConnector.nodes = nodes;
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
