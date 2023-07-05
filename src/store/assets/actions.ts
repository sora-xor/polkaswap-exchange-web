import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { defineActions } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { assetsActionContext } from '@/store/assets';
import type { BridgeRegisteredAsset } from '@/store/assets/types';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import ethersUtil from '@/utils/ethers-util';

import type { ActionContext } from 'vuex';

async function getEthRegisteredAssets(
  context: ActionContext<any, any>
): Promise<Record<string, BridgeRegisteredAsset>[]> {
  const { rootDispatch } = assetsActionContext(context);

  const networkAssets = await ethBridgeApi.getRegisteredAssets();
  const registeredAssets: Record<string, BridgeRegisteredAsset>[] = [];

  for (const asset of networkAssets) {
    const soraAddress = asset.address;
    const address = asset.externalAddress || (await rootDispatch.web3.getEvmTokenAddressByAssetId(soraAddress));
    const decimals = +asset.externalDecimals ?? (await ethersUtil.getAssetDecimals(address));

    registeredAssets.push({
      [soraAddress]: {
        address,
        decimals,
      },
    });
  }

  return registeredAssets;
}

async function getEvmRegisteredAssets(
  context: ActionContext<any, any>
): Promise<Record<string, BridgeRegisteredAsset>[]> {
  const { rootState } = assetsActionContext(context);

  const evmNetworkId = rootState.web3.networkSelected;
  const networkAssets = await evmBridgeApi.getRegisteredAssets(evmNetworkId as number);

  const registeredAssets = Object.entries(networkAssets).map(([soraAddress, assetData]) => {
    const accountAsset = {
      address: assetData.address as string,
      contract: '', // map with appKinds
      decimals: assetData.decimals,
    };

    return {
      [soraAddress]: accountAsset,
    };
  });

  return registeredAssets;
}

async function getSubRegisteredAssets(
  context: ActionContext<any, any>
): Promise<Record<string, BridgeRegisteredAsset>[]> {
  const { rootState } = assetsActionContext(context);

  const subNetwork = rootState.web3.networkSelected;

  const networkAssets = await subBridgeApi.getRegisteredAssets(subNetwork as SubNetwork);

  const registeredAssets = Object.entries(networkAssets).map(([soraAddress, assetData]) => {
    const accountAsset = {
      address: '',
      decimals: assetData.decimals,
    };

    return {
      [soraAddress]: accountAsset,
    };
  });

  return registeredAssets;
}

async function getRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, BridgeRegisteredAsset>[]> {
  const { rootState } = assetsActionContext(context);

  switch (rootState.web3.networkType) {
    case BridgeNetworkType.EvmLegacy: {
      return await getEthRegisteredAssets(context);
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
  async updateRegisteredAssets(context): Promise<void> {
    const { commit } = assetsActionContext(context);

    commit.resetRegisteredAssets();
    commit.setRegisteredAssetsFetching(true);

    try {
      const list = await getRegisteredAssets(context);
      const registeredAssets = list.reduce((buffer, asset) => ({ ...buffer, ...asset }), {});

      commit.setRegisteredAssets(registeredAssets);
    } catch (error) {
      console.error(error);
      commit.resetRegisteredAssets();
    }
  },
});

export default actions;
