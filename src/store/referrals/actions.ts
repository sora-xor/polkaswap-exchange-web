import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';

import { referralsActionContext } from '@/store/referrals';

const actions = defineActions({
  async getReferrer(context, invitedUserId: string): Promise<void> {
    const { commit } = referralsActionContext(context);
    commit.resetReferrer();
    try {
      const referrer = await api.referralSystem.getReferrer(invitedUserId);
      commit.setReferrer(referrer);
    } catch (error) {
      commit.resetReferrer();
    }
  },
  async subscribeOnInvitedUsers(context, referrerId: string): Promise<void> {
    const { commit, rootGetters } = referralsActionContext(context);

    commit.resetInvitedUsersSubscription();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    const subscription = api.referralSystem.subscribeOnInvitedUsers(referrerId).subscribe((users) => {
      commit.setInvitedUsers(users);
    });

    commit.setInvitedUsersSubscription(subscription);
  },
});

export default actions;
