import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { defineActions } from 'direct-vuex';

import { assetsActionContext } from '@/store/assets';
import type { BridgeRegisteredAsset } from '@/store/assets/types';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import ethersUtil from '@/utils/ethers-util';

import type { EvmNetwork } from '@sora-substrate/util/build/bridgeProxy/evm/types';
import type { SubNetwork, SubAssetId } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { ActionContext } from 'vuex';

async function updateEthAssetsData(context: ActionContext<any, any>): Promise<void> {
  const { state, commit, rootDispatch, rootGetters } = assetsActionContext(context);
  const { registeredAssets } = state;
  const { isValidNetwork } = rootGetters.web3;

  if (!isValidNetwork) return;

  const updatedEntries = await Promise.all(
    Object.entries(registeredAssets).map(async ([soraAddress, assetData]) => {
      const asset = { ...assetData };
      if (!asset.address) {
        asset.address = await rootDispatch.web3.getEvmTokenAddressByAssetId(soraAddress);
        asset.decimals = await ethersUtil.getTokenDecimals(asset.address);
      }
      return [soraAddress, asset];
    })
  );

  const assets = Object.fromEntries(updatedEntries);

  commit.setRegisteredAssets(assets);
}

async function getEthRegisteredAssets(): Promise<Record<string, BridgeRegisteredAsset>[]> {
  const networkAssets = await ethBridgeApi.getRegisteredAssets();
  const registeredAssets = Object.entries(networkAssets).map(([soraAddress, assetData]) => {
    return {
      [soraAddress]: {
        address: assetData.address,
        decimals: assetData.decimals ?? 18,
        kind: assetData.assetKind,
      },
    };
  });

  return registeredAssets;
}

async function getEvmRegisteredAssets(
  context: ActionContext<any, any>
): Promise<Record<string, BridgeRegisteredAsset>[]> {
  const { rootState } = assetsActionContext(context);

  const evmNetwork = rootState.web3.networkSelected;
  const networkAssets = await evmBridgeApi.getRegisteredAssets(evmNetwork as EvmNetwork);
  const registeredAssets = Object.entries(networkAssets).map(([soraAddress, assetData]) => {
    return {
      [soraAddress]: {
        address: assetData.address,
        decimals: assetData.decimals,
        kind: assetData.appKind,
      },
    };
  });

  return registeredAssets;
}

const getSubAssetIdAddress = (address: SubAssetId, network: SubNetwork): string => {
  if (network === SubNetworkId.Liberland) {
    const id = typeof address === 'object' ? address?.Asset?.toString() : '';

    return id ?? '';
  }

  return '';
};

async function getSubRegisteredAssets(
  context: ActionContext<any, any>
): Promise<Record<string, BridgeRegisteredAsset>[]> {
  const { rootState } = assetsActionContext(context);

  const subNetwork = rootState.web3.networkSelected;

  if (!subNetwork) return [];

  const subNetworkId = subNetwork as SubNetwork;

  // [TODO] remove when non ACA tokens are supported
  if (subNetworkId === SubNetworkId.PolkadotAcala) {
    return [
      {
        '0x001ddbe1a880031da72f7ea421260bec635fa7d1aa72593d5412795408b6b2ba': {
          address: '',
          decimals: 12,
          kind: 'Sidechain',
        },
      },
    ];
  }

  const networkAssets = await subBridgeApi.getRegisteredAssets(subNetworkId);
  const registeredAssets = Object.entries(networkAssets).map(([soraAddress, assetData]) => {
    return {
      [soraAddress]: {
        address: getSubAssetIdAddress(assetData.address, subNetworkId),
        decimals: assetData.decimals,
        kind: assetData.assetKind,
      },
    };
  });

  return registeredAssets;
}

async function getRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, BridgeRegisteredAsset>[]> {
  const { rootState } = assetsActionContext(context);

  switch (rootState.web3.networkType) {
    case BridgeNetworkType.Eth: {
      return await getEthRegisteredAssets();
    }
    case BridgeNetworkType.Evm: {
      return await getEvmRegisteredAssets(context);
    }
    case BridgeNetworkType.Sub: {
      return await getSubRegisteredAssets(context);
    }
    default:
      return [];
  }
}

const actions = defineActions({
  // for common usage
  async getRegisteredAssets(context): Promise<void> {
    const { commit, dispatch } = assetsActionContext(context);

    commit.setRegisteredAssets();
    commit.setRegisteredAssetsFetching(true);

    try {
      const list = await getRegisteredAssets(context);
      const registeredAssets = list.reduce((buffer, asset) => ({ ...buffer, ...asset }), {});

      commit.setRegisteredAssets(registeredAssets);
      // update assets data (for Eth bridge)
      await dispatch.updateRegisteredAssets();
    } catch (error) {
      console.error(error);
      commit.setRegisteredAssets();
    } finally {
      commit.setRegisteredAssetsFetching(false);
    }
  },

  async updateRegisteredAssets(context): Promise<void> {
    const { commit, rootState } = assetsActionContext(context);
    // only for ETH bridge, because of sora assets broken registration
    if (rootState.web3.networkType === BridgeNetworkType.Eth) {
      commit.setRegisteredAssetsFetching(true);

      await updateEthAssetsData(context);

      commit.setRegisteredAssetsFetching(false);
    }
  },
});

export default actions;
