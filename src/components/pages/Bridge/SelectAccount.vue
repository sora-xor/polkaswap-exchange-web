<template>
  <dialog-base :visible.sync="visibility" :title="t('connection.selectAccount')" custom-class="account-select-dialog">
    <div class="account-select">
      <address-book-input v-model="address" :is-valid="validAddress" ref="input" />

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
import { state, mutation } from '@/store/decorators';

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
  @mutation.web3.setSubAddress private setSubAddress!: (opts: { address: string; name: string }) => Promise<void>;

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
    if (!(this.address && api.validateAddress(this.address))) return false;
    try {
      api.formatAddress(this.address);
      return true; // if it can be formatted -> it's correct
    } catch {
      return false; // EVM account address
    }
  }

  handleSelectAddress(): void {
    // [TODO] emit name from address-book-input
    const name = this.address ? (this.$refs.input as any).name : '';
    this.setSubAddress({ address: this.address, name });
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
