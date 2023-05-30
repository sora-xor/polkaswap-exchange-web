import { defineActions } from 'direct-vuex';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import type { ActionContext } from 'vuex';

import ethersUtil from '@/utils/ethers-util';
import { assetsActionContext } from '@/store/assets';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
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

  const evmNetworkId = rootState.web3.evmNetworkSelected;
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
      return [];
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
