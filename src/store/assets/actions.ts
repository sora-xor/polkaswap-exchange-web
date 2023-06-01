import { defineActions } from 'direct-vuex';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import type { ActionContext } from 'vuex';

import ethersUtil from '@/utils/ethers-util';
import { assetsActionContext } from '@/store/assets';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { ZeroStringValue } from '@/consts';

import type { EvmAccountAsset } from '@/store/assets/types';

async function getEthRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, EvmAccountAsset>[]> {
  const networkAssets = await ethBridgeApi.getRegisteredAssets();

  const registeredAssets = networkAssets.reduce<Record<string, EvmAccountAsset>[]>((buffer, asset) => {
    buffer.push({
      [asset.address]: {
        address: asset.externalAddress,
        balance: ZeroStringValue,
        decimals: +asset.externalDecimals,
      },
    });
    return buffer;
  }, []);

  return registeredAssets;
}

async function getEvmRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, EvmAccountAsset>[]> {
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

async function getSubRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, EvmAccountAsset>[]> {
  const { rootState } = assetsActionContext(context);

  return [
    // KAR
    {
      '0x005963f9e01c987ae213bca46603d8b569ebbf91d3c52ab59207d7e4dae87bff': {
        address: '',
        balance: '0',
        decimals: 12,
      },
    },
    // AUSD
    {
      '0x00c9b0c0ce84da8283187401b673c5ece0b307f270036076f129fc4edfb9083f': {
        address: '',
        balance: '0',
        decimals: 12,
      },
    },
    // LKSM
    {
      '0x00f62e4fbc53f2fd30879da96b6b9a928ca5cc5573df86c8e583446023803860': {
        address: '',
        balance: '0',
        decimals: 12,
      },
    },
  ];

  // const subNetwork = rootState.web3.networkSelected;
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

async function getRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, EvmAccountAsset>[]> {
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
      const registeredAssetsList = await getRegisteredAssets(context);
      const registeredAssets = registeredAssetsList.reduce((buffer, asset) => ({ ...buffer, ...asset }), {});

      commit.setRegisteredAssets(registeredAssets);
    } catch (error) {
      console.error(error);
      commit.resetRegisteredAssets();
    }
  },

  async updateExternalBalances(context): Promise<void> {
    const { commit, state, rootDispatch, rootCommit, rootState } = assetsActionContext(context);

    // [TODO]
    if (rootState.web3.networkType === BridgeNetworkType.Sub) return;

    commit.setRegisteredAssetsBalancesUpdating(true);

    const accountAddress = rootState.web3.evmAddress;
    const updated = await Promise.all(
      Object.entries(state.registeredAssets).map(async ([soraAddress, asset]) => {
        const accountAsset = { ...asset };
        try {
          if (!accountAsset.address) {
            accountAsset.address = await rootDispatch.web3.getEvmTokenAddressByAssetId(soraAddress);
          }
          if (accountAsset.address) {
            const { value, decimals } = await ethersUtil.getAccountAssetBalance(accountAddress, accountAsset.address);

            accountAsset.balance = value;
            accountAsset.decimals = decimals;

            // update evmBalance
            if (ethersUtil.isNativeEvmTokenAddress(accountAsset.address)) {
              rootCommit.web3.setEvmBalance(value);
            }
          }
        } catch (error) {
          console.error(error);
        }
        return { [soraAddress]: accountAsset };
      })
    );
    const registeredAssets = updated.reduce((buffer, asset) => ({ ...buffer, ...asset }), {});
    commit.setRegisteredAssets(registeredAssets);
    commit.setRegisteredAssetsBalancesUpdating(false);
  },
});

export default actions;
