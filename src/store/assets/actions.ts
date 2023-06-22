import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { defineActions } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import { assetsActionContext } from '@/store/assets';
import type { BridgeAccountAsset } from '@/store/assets/types';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { subConnector } from '@/utils/bridge/sub/classes/adapter';
import ethersUtil from '@/utils/ethers-util';

import type { ActionContext } from 'vuex';

async function getEthRegisteredAssets(context: ActionContext<any, any>): Promise<Record<string, BridgeAccountAsset>[]> {
  const networkAssets = await ethBridgeApi.getRegisteredAssets();

  const registeredAssets = networkAssets.reduce<Record<string, BridgeAccountAsset>[]>((buffer, asset) => {
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

async function updateSubBalances(context: ActionContext<any, any>): Promise<Record<string, BridgeAccountAsset>[]> {
  const { state, rootCommit, rootState } = assetsActionContext(context);
  // fetch balances for current sora account
  const accountAddress = rootState.wallet.account.address;

  const updated = await Promise.all(
    Object.entries(state.registeredAssets).map(async ([soraAddress, asset]) => {
      const accountAsset = { ...asset };
      const balance = await subConnector.adapter.getTokenBalance(accountAddress, accountAsset.address);
      accountAsset.balance = balance;
      // [TODO] native token balance update
      if (!accountAsset.address) {
        rootCommit.web3.setEvmBalance(balance);
      }
      return { [soraAddress]: accountAsset };
    })
  );

  return updated;
}

async function updateEvmBalances(context: ActionContext<any, any>): Promise<Record<string, BridgeAccountAsset>[]> {
  const { state, rootDispatch, rootCommit, rootState } = assetsActionContext(context);

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

  return updated;
}

async function getRegisteredAssetsBalances(
  context: ActionContext<any, any>
): Promise<Record<string, BridgeAccountAsset>[]> {
  const { rootState } = assetsActionContext(context);

  switch (rootState.web3.networkType) {
    case BridgeNetworkType.EvmLegacy:
    case BridgeNetworkType.Evm: {
      return await updateEvmBalances(context);
    }
    case BridgeNetworkType.Sub: {
      return await updateSubBalances(context);
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

  // for common usage
  async updateExternalBalances(context): Promise<void> {
    const { commit } = assetsActionContext(context);

    commit.setRegisteredAssetsBalancesUpdating(true);

    try {
      const list = await getRegisteredAssetsBalances(context);
      const registeredAssets = list.reduce((buffer, asset) => ({ ...buffer, ...asset }), {});

      commit.setRegisteredAssets(registeredAssets);
    } catch (error) {
      console.error(error);
    } finally {
      commit.setRegisteredAssetsBalancesUpdating(false);
    }
  },
});

export default actions;
