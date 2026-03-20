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
import { defineComponent } from 'vue';
import { mapActions, mapGetters, mapState } from 'vuex';

import { delay } from '../util';
import { unlockAccountPair } from '../util/account';

import AccountConfirmDialog from './Account/ConfirmDialog.vue';
import LoadingMixin from './mixins/LoadingMixin';
import NotificationMixin from './mixins/NotificationMixin';

import type { PolkadotJsAccount } from '../types/common';
import type { WithKeyring } from '@sora-substrate/sdk';

export default defineComponent({
  components: {
    AccountConfirmDialog,
  },
  mixins: [NotificationMixin, LoadingMixin],
  props: {
    account: {
      required: true,
      type: Object as () => PolkadotJsAccount,
    },
    chainApi: {
      required: true,
      type: Object as () => WithKeyring,
    },
    visibility: {
      required: true,
      type: Boolean,
    },
    setVisibility: {
      required: true,
      type: Function as () => (flag: boolean) => void,
    },
  },
  computed: {
    ...mapState('wallet/transactions', ['isSignTxDialogDisabled']),
    ...mapGetters('wallet/account', ['getPassword']),
    visible: {
      get(this: any): boolean {
        return this.visibility;
      },
      set(this: any, flag: boolean): void {
        this.setVisibility(flag);
      },
    },
    passphrase(this: any): Nullable<string> {
      const address = this.account?.address;

      return address ? this.getPassword(address) : null;
    },
  },
  methods: {
    ...mapActions('wallet/account', ['setAccountPassphrase', 'resetAccountPassphrase']),
    async handleConfirm(this: any, password: string): Promise<void> {
      await this.withLoading(async () => {
        // hack: to render loading state before sync code execution, 250 - button transition
        await this.$nextTick();
        await delay(250);

        await this.withAppNotification(async () => {
          const address = this.account?.address;

          if (!address) {
            this.setVisibility(false);
            return;
          }

          unlockAccountPair(this.chainApi, password);

          if (this.isSignTxDialogDisabled) {
            this.setAccountPassphrase({ address, password });
          } else {
            this.resetAccountPassphrase(address);
          }

          this.setVisibility(false);
        });
      });
    },
  },
});
</script>
