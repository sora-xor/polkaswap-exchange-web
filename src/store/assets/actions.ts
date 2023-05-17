import isEmpty from 'lodash/fp/isEmpty';
import { defineActions } from 'direct-vuex';
import type { ActionContext } from 'vuex';

import ethersUtil from '@/utils/ethers-util';
import { assetsActionContext } from '@/store/assets';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { ZeroStringValue } from '@/consts';
import { BridgeType } from '@/consts/evm';

import type { EvmAccountAsset } from '@/store/assets/types';

async function getEthRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, EvmAccountAsset>[]> {
  const { rootDispatch, rootState, rootCommit, state } = assetsActionContext(context);

  const accountAddress = rootState.web3.evmAddress;

  let registeredAssets: Record<string, EvmAccountAsset> = {};

  if (isEmpty(state.registeredAssets)) {
    const networkAssets = await ethBridgeApi.getRegisteredAssets();

    registeredAssets = networkAssets.reduce((buffer, asset) => {
      buffer[asset.address] = {
        address: asset.externalAddress,
        balance: ZeroStringValue,
        decimals: +asset.externalDecimals,
      };
      return buffer;
    }, {});
  } else {
    registeredAssets = { ...state.registeredAssets };
  }

  const networkAssetsWithBalance = await Promise.all(
    Object.entries(registeredAssets).map(async ([soraAddress, assetData]) => {
      const accountAsset = { ...assetData };
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

      return {
        [soraAddress]: accountAsset,
      };
    })
  );

  return networkAssetsWithBalance;
}

async function getEvmRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, EvmAccountAsset>[]> {
  const { rootState, rootCommit } = assetsActionContext(context);

  const accountAddress = rootState.web3.evmAddress;
  const evmNetworkId = rootState.web3.evmNetworkSelected;
  const networkAssets = await evmBridgeApi.getNetworkAssets(evmNetworkId as number);

  const networkAssetsWithBalance = await Promise.all(
    Object.entries(networkAssets).map(async ([soraAddress, assetData]) => {
      const accountAsset = {
        address: assetData.evmAddress as string,
        balance: ZeroStringValue,
        contract: assetData.contract,
        decimals: 18,
      };

      try {
        const { value, decimals } = await ethersUtil.getAccountAssetBalance(accountAddress, accountAsset.address);

        accountAsset.balance = value;
        accountAsset.decimals = decimals;

        // update evmBalance
        if (ethersUtil.isNativeEvmTokenAddress(accountAsset.address)) {
          rootCommit.web3.setEvmBalance(value);
        }
      } catch (error) {
        console.error(error);
      }

      return {
        [soraAddress]: accountAsset,
      };
    })
  );

  return networkAssetsWithBalance;
}

const actions = defineActions({
  // for common usage
  async updateRegisteredAssets(context, reset?: boolean): Promise<void> {
    const { state, commit, rootState } = assetsActionContext(context);

    if (state.registeredAssetsFetching) return;

    if (reset) commit.resetRegisteredAssets();

    const networkType = rootState.web3.networkType;

    commit.setRegisteredAssetsFetching(true);

    try {
      const networkAssetsWithBalance = await (async () => {
        switch (networkType) {
          case BridgeType.ETH: {
            return await getEthRegisteredAssets(context);
          }
          case BridgeType.EVM: {
            return await getEvmRegisteredAssets(context);
          }
          case BridgeType.SUB: {
            return [];
          }
        }
      })();

      const registeredAssets = networkAssetsWithBalance.reduce((buffer, asset) => ({ ...buffer, ...asset }), {});

      commit.setRegisteredAssets(registeredAssets);
    } catch (error) {
      console.error(error);
      commit.resetRegisteredAssets();
    }
  },
});

export default actions;
