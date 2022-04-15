import { defineActions } from 'direct-vuex';

import { assetsActionContext } from '@/store/assets';
import { bridgeApi } from '@/utils/bridge';
import { ZeroStringValue } from '@/consts';
import type { RegisterAssetWithExternalBalance } from './types';

const DISABLED_ASSETS_FOR_BRIDGE = [
  '0x0083a6b3fbc6edae06f115c8953ddd7cbfba0b74579d6ea190f96853073b76f4', // USDT
  '0x000974185b33df1db9beae5df570d68b8db8b517bb3d5c509eea906a81414c91', // OMG
  '0x00e16b53b05b8a7378f8f3080bef710634f387552b1d1916edc578bda89d49e5', // BAT
  '0x009749fbd2661866f0151e367365b7c5cc4b2c90070b4f745d0bb84f2ffb3b33', // HT
  '0x007d998d3d13fbb74078fb58826e3b7bc154004c9cef6f5bccb27da274f02724', // CHSB
  '0x00d69fbc298e2e27c3deaee4ef0802501e98c338baa11634f08f5c04b9eebdc0', // cUSDC
  '0x005e152271f8816d76221c7a0b5c6cafcb54fdfb6954dd8812f0158bfeac900d', // AGI
];

const actions = defineActions({
  async updateRegisteredAssets(context): Promise<void> {
    const { state, commit, rootDispatch } = assetsActionContext(context);
    try {
      if (state.registeredAssetsFetching) return;

      commit.setRegisteredAssetsFetching(true);

      const registeredAssets = await bridgeApi.getRegisteredAssets();
      const enabledRegisteredAssets = registeredAssets.filter(
        (item) => !DISABLED_ASSETS_FOR_BRIDGE.includes(item.address)
      );
      const preparedRegisteredAssets = await Promise.all(
        enabledRegisteredAssets.map(async (item) => {
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
  async getRegisteredAssets(context): Promise<void> {
    const { dispatch, commit } = assetsActionContext(context);
    commit.resetRegisteredAssets();
    await dispatch.updateRegisteredAssets();
  },
});

export default actions;
