<template>
  <dialog-base :visible.sync="visibility" :title="t('connection.selectAccount')" custom-class="account-select-dialog">
    <div class="account-select">
      <address-book-input v-model="address" :is-valid="validAddress" />

      <s-button
        class="s-typography-button--large account-select-button"
        type="primary"
        :disabled="!validAddress"
        @click="handleSelectAddress"
      >
        {{ t('saveText') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, state, mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    AddressBookInput: components.AddressBookInput,
  },
})
export default class BridgeSelectAccount extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @state.web3.subAddress private subAddress!: string;
  @state.web3.selectAccountDialogVisibility private selectAccountDialogVisibility!: boolean;
  @mutation.web3.setSelectAccountDialogVisibility private setSelectAccountDialogVisibility!: (flag: boolean) => void;
  @mutation.web3.setSubAddress private setSubAddress!: (address: string) => Promise<void>;

  address = '';

  @Watch('visibility')
  private updateAddress(isVisible: boolean) {
    this.address = isVisible ? this.subAddress : '';
  }

  get visibility(): boolean {
    return this.selectAccountDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectAccountDialogVisibility(flag);
  }

  get validAddress(): boolean {
    return !!this.address && api.validateAddress(this.address);
  }

  handleSelectAddress(): void {
    this.setSubAddress(this.address);
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
