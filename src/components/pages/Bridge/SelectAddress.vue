<template>
  <div class="select-address">
    <address-book-input ref="input" v-model="address" :is-valid="validAddress" @update-name="updateName" />

    <s-button
      class="s-typography-button--large select-address-button"
      type="primary"
      :disabled="!validAddress"
      @click="handleSelectAddress"
    >
      {{ t('saveText') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { api, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, ModelSync } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    AddressBookInput: components.AddressBookInput,
  },
})
export default class BridgeSelectAddress extends Mixins(TranslationMixin) {
  @ModelSync('value', 'input', { type: String })
  readonly address!: string;

  private name = '';

  get validAddress(): boolean {
    return api.validateAddress(this.address);
  }

  handleSelectAddress(): void {
    this.$emit('select', { address: this.address, name: this.name });
  }

  updateName(name: string): void {
    this.name = name;
  }
}
</script>

<style lang="scss" scoped>
.select-address {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;

  @include full-width-button('select-address-button', 0);
}
</style>
