import { defineActions } from 'direct-vuex';
import { SubqueryExplorerService, api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';

import { noirActionContext } from '@/store/noir';
import { NOIR_TOKEN_ADDRESS, NOIR_ADDRESS_ID } from '@/consts';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const actions = defineActions({
  async getRedemptionData(context): Promise<void> {
    const { commit } = noirActionContext(context);
    try {
      const totalRedeemed = await SubqueryExplorerService.getNoirTotalRedeemed(NOIR_ADDRESS_ID, NOIR_TOKEN_ADDRESS);

      if (!totalRedeemed) {
        commit.setRedemptionDataFailure();
        return;
      }

      const totalSupply = await (api.api.rpc as any).assets.totalSupply(NOIR_TOKEN_ADDRESS);
      const noirTotalSupply = new FPNumber(totalSupply);
      const [_, noirReserve] = await api.poolXyk.getReserves(XOR.address, NOIR_TOKEN_ADDRESS);

      commit.setRedemptionDataSuccess({
        totalRedeemed,
        noirReserve,
        noirTotalSupply,
      });
    } catch (error) {
      commit.setRedemptionDataFailure();
    }
  },

  subscribeOnRedemptionDataUpdates(context): void {
    const { commit, dispatch } = noirActionContext(context);

    dispatch.getRedemptionData();

    const subscription = setInterval(() => {
      dispatch.getRedemptionData();
    }, FIFTEEN_MINUTES);

    commit.setRedemptionDataSubscription(subscription);
  },

  async redeem(context): Promise<void> {
    // await api.transfer(NOIR_TOKEN_ADDRESS, NOIR_ADDRESS_ID, count);
  },
});

export default actions;
