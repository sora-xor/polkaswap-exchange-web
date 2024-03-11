import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { getReferralRewards } from '@/indexer/queries/referrals';
import { referralsActionContext } from '@/store/referrals';

const actions = defineActions({
  async getReferrer(context): Promise<void> {
    const { commit } = referralsActionContext(context);
    commit.resetReferrer();
    try {
      const referrer = await api.referralSystem.getAccountReferrer();
      commit.setReferrer(referrer);
    } catch (error) {
      commit.resetReferrer();
    }
  },
  async subscribeOnReferrer(context): Promise<void> {
    const { commit, rootGetters } = referralsActionContext(context);
    commit.resetReferrerSubscription();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    const subscription = api.referralSystem
      .subscribeOnReferrer(rootGetters.wallet.account.account.address)
      .subscribe((referrer) => {
        if (referrer) {
          commit.setReferrer(referrer);
        }
      });

    commit.setReferrerSubscription(subscription);
  },
  async subscribeOnInvitedUsers(context): Promise<void> {
    const { commit, rootGetters } = referralsActionContext(context);

    commit.resetInvitedUsersSubscription();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    const subscription = api.referralSystem.subscribeOnAccountInvitedUsers().subscribe((users) => {
      commit.setInvitedUsers(users);
    });

    commit.setInvitedUsersSubscription(subscription);
  },
  async getAccountReferralRewards(context): Promise<void> {
    const { commit, rootGetters } = referralsActionContext(context);

    commit.clearReferralRewards();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    const data = await getReferralRewards(rootGetters.wallet.account.account.address);

    if (data) {
      commit.setReferralRewards(data);
    }
  },
});

export default actions;
