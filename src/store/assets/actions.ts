import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { defineActions } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { assetsActionContext } from '@/store/assets';
import type { BridgeAccountAsset } from '@/store/assets/types';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import ethersUtil from '@/utils/ethers-util';

import type { ActionContext } from 'vuex';

async function getEthRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, BridgeAccountAsset>[]> {
  const { rootDispatch } = assetsActionContext(context);

  const networkAssets = await ethBridgeApi.getRegisteredAssets();
  const registeredAssets: Record<string, BridgeAccountAsset>[] = [];

  for (const asset of networkAssets) {
    const soraAddress = asset.address;
    const address = asset.externalAddress || (await rootDispatch.web3.getEvmTokenAddressByAssetId(soraAddress));
    const decimals = +asset.externalDecimals ?? (await ethersUtil.getAssetDecimals(address));

    registeredAssets.push({
      [soraAddress]: {
        address,
        balance: ZeroStringValue,
        decimals,
      },
    });
  }

  return registeredAssets;
}

async function getEvmRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, BridgeAccountAsset>[]> {
  const { rootState } = assetsActionContext(context);

  const evmNetworkId = rootState.web3.networkSelected;
  const networkAssets = await evmBridgeApi.getRegisteredAssets(evmNetworkId as number);

  const registeredAssets = Object.entries(networkAssets).map(([soraAddress, assetData]) => {
    const accountAsset = {
      address: assetData.address as string,
      balance: ZeroStringValue,
      contract: '', // map with appKinds
      decimals: assetData.decimals,
    };

    return {
      [soraAddress]: accountAsset,
    };
  });

  return registeredAssets;
}

async function getSubRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, BridgeAccountAsset>[]> {
  const { rootState } = assetsActionContext(context);

  const subNetwork = rootState.web3.networkSelected;

  if (subNetwork === SubNetwork.Rococo) {
    return [
      // ROC
      {
        '0x00f62e4fbc53f2fd30879da96b6b9a928ca5cc5573df86c8e583446023803860': {
          address: '',
          balance: '0',
          decimals: 12,
        },
      },
    ];
  } else {
    return [
      // KAR
      {
        '0x00c9b0c0ce84da8283187401b673c5ece0b307f270036076f129fc4edfb9083f': {
          address: '',
          balance: '0',
          decimals: 12,
        },
      },
    ];
  }

  // const networkAssets = await subBridgeApi.getRegisteredAssets(subNetwork as SubNetwork);

  // const registeredAssets = Object.entries(networkAssets).map(([soraAddress, assetData]) => {
  //   const accountAsset = {
  //     address: '', // [TODO]
  //     balance: ZeroStringValue,
  //     decimals: assetData.decimals,
  //   };

  //   return {
  //     [soraAddress]: accountAsset,
  //   };
  // });

  // return registeredAssets;
}

async function getRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, BridgeAccountAsset>[]> {
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
