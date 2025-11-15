<template>
  <account-confirm-dialog
    v-model:visible="visible"
    with-timeout
    :account="account"
    :loading="loading"
    :passphrase="passphrase"
    :confirm-button-text="t('desktop.dialog.confirmButton')"
    @confirm="handleConfirm"
  ></account-confirm-dialog>
</template>

<script lang="ts">
import { Options, mixins, Prop } from 'vue-property-decorator';

import { getter, action, state } from '../store/decorators';
import { delay } from '../util';
import { unlockAccountPair } from '../util/account';

import AccountConfirmDialog from './Account/ConfirmDialog.vue';
import LoadingMixin from './mixins/LoadingMixin';
import NotificationMixin from './mixins/NotificationMixin';

import type { PolkadotJsAccount } from '../types/common';
import type { WithKeyring } from '@sora-substrate/sdk';

@Options({
  components: {
    AccountConfirmDialog,
  },
})
export default class ConfirmDialog extends mixins(NotificationMixin, LoadingMixin) {
  @Prop({ required: true, type: Object }) public readonly account!: PolkadotJsAccount;
  @Prop({ required: true, type: Object }) public readonly chainApi!: WithKeyring;
  @Prop({ required: true, type: Boolean }) private visibility!: boolean;
  @Prop({ required: true, type: Function }) private setVisibility!: (flag: boolean) => void;

  @state.transactions.isSignTxDialogDisabled private isSignTxDialogDisabled!: boolean;

  @getter.account.getPassword private getPassword!: (accountAddress: string) => Nullable<string>;

  @action.account.setAccountPassphrase private setAccountPassphrase!: (opts: {
    address: string;
    password: string;
  }) => void;

  @action.account.resetAccountPassphrase private resetAccountPassphrase!: (address: string) => void;

  get visible(): boolean {
    return this.visibility;
  }

  set visible(flag: boolean) {
    this.setVisibility(flag);
  }

  get passphrase(): Nullable<string> {
    return this.getPassword(this.account.address);
  }

  async handleConfirm(password: string): Promise<void> {
    await this.withLoading(async () => {
      // hack: to render loading state before sync code execution, 250 - button transition
      await this.$nextTick();
      await delay(250);

      await this.withAppNotification(async () => {
        unlockAccountPair(this.chainApi, password);

        if (this.isSignTxDialogDisabled) {
          this.setAccountPassphrase({ address: this.account.address, password });
        } else {
          this.resetAccountPassphrase(this.account.address);
        }

        this.setVisibility(false);
      });
    });
  }
}
</script>
