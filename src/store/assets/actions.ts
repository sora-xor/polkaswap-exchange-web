import { defineActions } from 'direct-vuex';

import { assetsActionContext } from '@/store/assets';
import { bridgeApi } from '@/utils/bridge';
import { ZeroStringValue } from '@/consts';
import type { RegisterAssetWithExternalBalance } from './types';

const actions = defineActions({
  async updateRegisteredAssets(context, reset?: boolean): Promise<void> {
    const { state, commit, rootDispatch } = assetsActionContext(context);

    if (state.registeredAssetsFetching) return;

    if (reset) commit.resetRegisteredAssets();

    commit.setRegisteredAssetsFetching(true);

    try {
      const registeredAssets = await bridgeApi.getRegisteredAssets();

      const preparedRegisteredAssets = await Promise.all(
        registeredAssets.map(async (item) => {
          const accountAsset = { ...item, externalBalance: ZeroStringValue };

          try {
            if (!accountAsset.externalAddress) {
              accountAsset.externalAddress = await rootDispatch.web3.getEvmTokenAddressByAssetId(item.address);
            }
            if (accountAsset.externalAddress) {
              const { value, decimals } = await rootDispatch.web3.getBalanceByEvmAddress(accountAsset.externalAddress);
              accountAsset.externalBalance = value;

              if (!accountAsset.externalDecimals) {
                accountAsset.externalDecimals = decimals;
              }
            }
          } catch (error) {
            console.error(error);
          }
          return accountAsset as unknown as RegisterAssetWithExternalBalance; // TODO: check this array
        })
      );

      commit.setRegisteredAssets(preparedRegisteredAssets);
    } catch (error) {
      console.error(error);
      commit.resetRegisteredAssets();
    }
  },
});

export default actions;
