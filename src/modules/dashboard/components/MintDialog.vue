<template>
  <dialog-base :title="title" :visible.sync="isVisible" tooltip="COMING SOON...">
    <div class="dashboard-mint">
      <address-book-input
        class="dashboard-mint__address"
        v-model="address"
        :is-valid="validAddress"
        :disabled="loading"
      />
      <p class="p3 dashboard-mint__text">
        ENTER THE AMOUNT YOU WANT TO MINT
        <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
          <s-icon name="info-16" size="14px" />
        </s-tooltip>
      </p>
      <token-input
        ref="tokenInput"
        class="dashboard-mint__token-input"
        title="AMOUNT"
        v-model="value"
        :is-fiat-editable="editableFiat"
        :token="asset"
        :disabled="loading"
      />
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-mint__button"
        :disabled="disabled"
        @click="handleMint"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="emptyAddress">
          {{ t('walletSend.enterAddress') }}
        </template>
        <template v-else-if="!validAddress">
          {{ t('walletSend.badAddress') }}
        </template>
        <template v-else-if="emptyValue">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>{{ title }}</template>
      </s-button>
      <info-line
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      />
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Ref, Prop } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, ZeroStringValue, ObjectInit } from '@/consts';
import type { OwnedAsset } from '@/modules/dashboard/types';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    AddressBookInput: components.AddressBookInput,
    TokenInput: lazyComponent(Components.TokenInput),
  },
})
export default class MintDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xorSymbol = XOR.symbol;

  @Ref('tokenInput') tokenInput!: Nullable<TokenInput>;

  @Prop({ default: false, type: Boolean }) readonly editableFiat!: boolean;
  @Prop({ default: ObjectInit, type: Object }) readonly asset!: OwnedAsset;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

  value = '';
  address = '';

  @Watch('visible')
  private async handleDialogVisibility(value: boolean): Promise<void> {
    await this.$nextTick();
    this.value = '';
    this.address = '';
    this.tokenInput?.focus();
  }

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get tokenSymbol(): string {
    return this.asset.symbol;
  }

  get title(): string {
    return `Mint ${this.tokenSymbol}`;
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.Mint];
  }

  private get fpNetworkFee() {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get emptyValue(): boolean {
    return !+this.value;
  }

  get isInsufficientXorForFee(): boolean {
    return this.xorBalance.sub(this.fpNetworkFee).isLtZero();
  }

  get emptyAddress(): boolean {
    return !this.address.trim();
  }

  get validAddress(): boolean {
    return !this.emptyAddress && api.validateAddress(this.address);
  }

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee || this.emptyValue || !this.validAddress;
  }

  async handleMint(): Promise<void> {
    try {
      await this.withNotifications(async () => {
        await api.assets.mint(this.asset, this.value, this.address.trim());
      });
    } finally {
      this.isVisible = false;
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-mint {
  @include full-width-button('action-button');

  &__address,
  &__button,
  &__text {
    margin-bottom: 16px;
  }
}
</style>
