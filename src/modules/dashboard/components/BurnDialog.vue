<template>
  <dialog-base :title="title" :visible.sync="isVisible" tooltip="COMING SOON...">
    <div class="dashboard-burn">
      <p class="p3 dashboard-burn__text">ENTER THE AMOUNT YOU WANT TO BURN</p>
      <token-input
        ref="tokenInput"
        class="dashboard-burn__token-input"
        with-slider
        title="AMOUNT"
        v-model="value"
        :is-fiat-editable="editableFiat"
        :is-max-available="isMaxAvailable"
        :token="asset"
        :balance="balance"
        :slider-value="valuePercent"
        :disabled="loading"
        @max="handleMaxValue"
        @slide="handlePercentChange"
      />
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-burn__button"
        :disabled="disabled"
        @click="handleBurn"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="emptyValue">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol }) }}
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
import { Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Ref, Prop } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, HundredNumber, ZeroStringValue } from '@/consts';
import type { OwnedAsset } from '@/modules/dashboard/types';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { isMaxButtonAvailable } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenInput: lazyComponent(Components.TokenInput),
  },
})
export default class BurnDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xorSymbol = XOR.symbol;

  @Ref('tokenInput') tokenInput!: Nullable<TokenInput>;

  @Prop({ default: ZeroStringValue, type: String }) readonly balance!: CodecString;
  @Prop({ default: false, type: Boolean }) readonly editableFiat!: boolean;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.dashboard.selectedOwnedAsset asset!: OwnedAsset;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

  value = '';

  @Watch('visible')
  private async handleDialogVisibility(value: boolean): Promise<void> {
    await this.$nextTick();
    this.value = '';
    this.tokenInput?.focus();
  }

  private get fpBalance() {
    return this.getFPNumberFromCodec(this.balance, this.asset.decimals);
  }

  private get xorBalance() {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  private get assetWithBalance(): AccountAsset {
    return { ...this.asset, balance: { transferable: this.balance } } as unknown as AccountAsset;
  }

  get title(): string {
    return `Burn ${this.tokenSymbol}`;
  }

  get tokenSymbol(): string {
    return this.asset.symbol;
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.Burn];
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

  get isMaxAvailable(): boolean {
    if (!this.accountXor) return false;

    return isMaxButtonAvailable(this.assetWithBalance, this.value ?? 0, this.networkFee, this.accountXor);
  }

  get isInsufficientBalance(): boolean {
    return this.fpBalance.sub(this.value || 0).isLtZero();
  }

  get isInsufficientXorForFee(): boolean {
    return this.xorBalance.sub(this.fpNetworkFee).isLtZero();
  }

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee || this.emptyValue || this.isInsufficientBalance;
  }

  get valuePercent(): number {
    if (!this.value) return 0;

    const percent = this.getFPNumber(this.value, this.asset.decimals)
      .div(this.fpBalance)
      .mul(HundredNumber)
      .toNumber(0);
    return percent > HundredNumber ? HundredNumber : percent;
  }

  handlePercentChange(percent: number): void {
    this.value = this.fpBalance.mul(percent / HundredNumber).toString();
  }

  handleMaxValue(): void {
    this.value = this.fpBalance.toString();
  }

  async handleBurn(): Promise<void> {
    if (this.isInsufficientBalance) {
      this.$alert(this.t('insufficientBalanceText', { tokenSymbol: this.tokenSymbol }), {
        title: this.t('errorText'),
      });
    } else {
      try {
        await this.withNotifications(async () => {
          await api.assets.burn(this.asset, this.value);
        });
      } catch (error) {
        console.error(error);
      }
    }
    this.isVisible = false;
  }
}
</script>

<style lang="scss" scoped>
.dashboard-burn {
  @include full-width-button('action-button');

  &__text,
  &__button {
    margin-bottom: 16px;
  }
}
</style>
