<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t(`referralProgram.${isBond ? 'bondTitle' : 'unbondTitle'}`)"
      @back="handleBack"
    />
    <s-form class="el-form--actions" :show-message="false">
      <token-input
        :balance="balance"
        :is-max-available="isMaxButtonAvailable"
        :title="t(`referralProgram.${isBond ? 'deposit' : 'action.unbond'}`)"
        :token="xor"
        :value="amount"
        @input="handleInputXor"
        @max="handleMaxValue"
      />

      <s-button
        class="action-button s-typography-button--large"
        type="primary"
        :disabled="isConfirmBondDisabled"
        :loading="loading"
        @click="handleConfirmBond"
      >
        <template v-if="hasZeroAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="isBondedBalance && isInsufficientBondedXor">
          {{ t('referralProgram.insufficientBondedBalance') }}
        </template>
        <template v-else>
          {{ t(`referralProgram.action.${isBond ? 'bond' : 'unbond'}`) }}
        </template>
      </s-button>
      <info-line
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      />
      <referrals-confirm-bonding :visible.sync="showConfirmBondDialog" @confirm="confirmBond" />
    </s-form>
  </div>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { Components, PageNames, ZeroStringValue } from '@/consts';
import router, { lazyComponent } from '@/router';
import { getter, mutation, state } from '@/store/decorators';
import { getMaxValue, hasInsufficientBalance, asZeroValue, getAssetBalance } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, AccountBalance } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenInput: lazyComponent(Components.TokenInput),
    ReferralsConfirmBonding: lazyComponent(Components.ReferralsConfirmBonding),
    InfoLine: components.InfoLine,
  },
})
export default class ReferralBonding extends Mixins(mixins.FormattedAmountMixin, mixins.TransactionMixin) {
  @state.wallet.transactions.isConfirmTxDialogEnabled private isConfirmTxEnabled!: boolean;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.referrals.amount amount!: string;

  @getter.assets.xor xor!: Nullable<AccountAsset>;

  @mutation.referrals.setAmount private setAmount!: (amount: string) => void;
  @mutation.referrals.resetAmount private resetAmount!: FnWithoutArgs;

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  showConfirmBondDialog = false;

  get xorSymbol(): string {
    return XOR.symbol;
  }

  get xorDecimals(): number {
    return XOR.decimals;
  }

  get xorBalance(): Nullable<AccountBalance> {
    return this.xor?.balance;
  }

  get balance(): CodecString {
    return getAssetBalance(this.xor, { isBondedBalance: this.isBondedBalance });
  }

  get isBond(): boolean {
    return this.$route.name === PageNames.ReferralBonding;
  }

  get isBondedBalance(): boolean {
    return !this.isBond;
  }

  get hasZeroAmount(): boolean {
    return asZeroValue(this.amount);
  }

  get isMaxButtonAvailable(): boolean {
    if (this.shouldBalanceBeHidden) {
      return false; // MAX button behavior discloses hidden balance so it should be hidden in ANY case
    }
    const balance = this.getFPNumberFromCodec(this.xorBalance?.transferable ?? ZeroStringValue, this.xorDecimals);
    const amount = this.getFPNumber(this.amount, this.xorDecimals);
    if (this.fpNumberNetworkFee.isZero()) {
      return false;
    }
    if (this.isBondedBalance) {
      const bonded = this.xorBalance?.bonded ?? ZeroStringValue;
      const isBondedZero = this.getFPNumberFromCodec(bonded, this.xorDecimals).isZero();
      return !isBondedZero && FPNumber.gt(balance, this.fpNumberNetworkFee);
    }
    return !FPNumber.eq(this.fpNumberNetworkFee, balance.sub(amount)) && FPNumber.gt(balance, this.fpNumberNetworkFee);
  }

  get isInsufficientBondedXor(): boolean {
    return (
      !!this.xor &&
      hasInsufficientBalance(this.xor, this.amount, this.networkFee, {
        isBondedBalance: this.isBondedBalance,
      })
    );
  }

  get isInsufficientXorForFee(): boolean {
    if (this.isBondedBalance) {
      return FPNumber.gt(
        this.fpNumberNetworkFee,
        this.getFPNumberFromCodec(this.xorBalance?.transferable ?? ZeroStringValue, this.xorDecimals)
      );
    }
    return !!this.xor && hasInsufficientBalance(this.xor, this.amount, this.networkFee);
  }

  get networkFee(): CodecString {
    return this.networkFees[this.isBond ? Operation.ReferralReserveXor : Operation.ReferralUnreserveXor];
  }

  get fpNumberNetworkFee(): FPNumber {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isConfirmBondDisabled(): boolean {
    return this.hasZeroAmount || this.isInsufficientXorForFee || this.isInsufficientBondedXor;
  }

  handleInputXor(value: string): void {
    if (value === this.amount) return;
    this.setAmount(value);
  }

  handleMaxValue(): void {
    const { xor, networkFee, isBondedBalance } = this;

    if (!xor) return;

    this.handleInputXor(getMaxValue(xor, networkFee, { isBondedBalance }));
  }

  handleConfirmBond(): void {
    if (this.isConfirmTxEnabled) {
      this.showConfirmBondDialog = true;
    } else {
      this.confirmBond();
    }
  }

  async confirmBond(): Promise<void> {
    await this.withNotifications(async () => {
      await (this.isBond ? api.referralSystem.reserveXor(this.amount) : api.referralSystem.unreserveXor(this.amount));

      this.resetAmount();
      this.handleBack();
    });
  }

  handleBack(): void {
    router.push({ name: PageNames.ReferralProgram });
  }

  destroyed(): void {
    this.resetAmount();
  }
}
</script>

<style lang="scss">
.bonding-preview {
  margin-bottom: $inner-spacing-medium;
  font-size: 13px;
  line-height: var(--s-line-height-medium);
  text-align: center;
  a {
    color: var(--s-color-theme-accent);
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include full-width-button('action-button');

  .action-button {
    margin-bottom: $inner-spacing-medium;
  }
}
</style>
