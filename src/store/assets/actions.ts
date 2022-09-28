import { defineActions } from 'direct-vuex';

import ethersUtil from '@/utils/ethers-util';
import { assetsActionContext } from '@/store/assets';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { ZeroStringValue } from '@/consts';

const actions = defineActions({
  async updateRegisteredAssets(context, reset?: boolean): Promise<void> {
    const { state, commit, rootCommit, rootState } = assetsActionContext(context);

    if (state.registeredAssetsFetching) return;

    if (reset) commit.resetRegisteredAssets();

    commit.setRegisteredAssetsFetching(true);

    try {
      const accountAddress = rootState.web3.evmAddress;

      const networkAssets = await evmBridgeApi.getNetworkAssets();

      const networkAssetsWithBalance = await Promise.all(
        Object.entries(networkAssets).map(async ([soraAddress, assetData]) => {
          const accountAsset = {
            // TODO [EVM] change contract to evmAddress after js-lib update
            address: (assetData as any).contract as string,
            balance: ZeroStringValue,
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

      const registeredAssets = networkAssetsWithBalance.reduce((buffer, asset) => ({ ...buffer, ...asset }), {});

      commit.setRegisteredAssets(registeredAssets);
    } catch (error) {
      console.error(error);
      commit.resetRegisteredAssets();
    }
  },
});

export default actions;
