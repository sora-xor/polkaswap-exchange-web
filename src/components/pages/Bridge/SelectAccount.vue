<template>
  <dialog-base
    :visible.sync="visibility"
    :title="t('connection.selectAccount')"
    :show-back="!isAccountSelect"
    @back="setAccountSelectView(true)"
    class="account-select-dialog"
  >
    <template v-if="isAccountSelect">
      <select-wallet-account />

      <s-button type="secondary" @click="setAccountSelectView(false)">Enter address</s-button>
    </template>

    <select-address v-else v-model="address" @select="handleSelectAddress" />
  </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, mutation } from '@/store/decorators';

import SelectAddress from './SelectAddress.vue';
import SelectWalletAccount from './SelectWalletAccount.vue';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SelectAddress,
    SelectWalletAccount,
  },
})
export default class BridgeSelectAccount extends Mixins(TranslationMixin) {
  @state.web3.subAddress private subAddress!: string;
  @state.web3.selectAccountDialogVisibility private selectAccountDialogVisibility!: boolean;
  @mutation.web3.setSelectAccountDialogVisibility private setSelectAccountDialogVisibility!: (flag: boolean) => void;
  @mutation.web3.setSubAddress private setSubAddress!: (contact: { address: string; name: string }) => Promise<void>;

  address = '';

  isAccountSelect = true;

  @Watch('visibility')
  private reset(isVisible: boolean) {
    this.address = isVisible ? this.subAddress : '';

    if (!isVisible) {
      this.isAccountSelect = true;
    }
  }

  get visibility(): boolean {
    return this.selectAccountDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectAccountDialogVisibility(flag);
  }

  setAccountSelectView(flag: boolean): void {
    this.isAccountSelect = flag;
  }

  handleSelectAddress(contact: { address: string; name: string }): void {
    this.setSubAddress(contact);
    this.visibility = false;
  }
}
</script>

<style lang="scss" scoped>
.account-select {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;

  @include full-width-button('account-select-button', 0);
}
</style>
