<template>
  <dialog-base :title="title" :visible.sync="isVisible" :tooltip="t('kensetsu.borrowMoreDescription')">
    <div class="borrow-more">
      <token-input
        ref="debtInput"
        class="borrow-more__debt-input borrow-more__token-input"
        with-slider
        is-fiat-editable
        v-model="borrowValue"
        :title="title"
        :balance-text="t('kensetsu.available')"
        :is-max-available="isMaxBorrowAvailable"
        :token="debtAsset"
        :balance="availableCodec"
        :slider-value="borrowValuePercent"
        :disabled="loading"
        @max="handleMaxBorrowValue"
        @slide="handleBorrowPercentChange"
      />
      <slippage-tolerance class="slippage-tolerance-settings borrow-more__slippage" />
      <prev-next-info-line
        :label="t('kensetsu.outstandingDebt')"
        :tooltip="t('kensetsu.outstandingDebtDescription')"
        :symbol="debtSymbol"
        :prev="formattedPrevBorrow"
        :next="formattedNextBorrow"
      />
      <prev-next-info-line
        symbol="%"
        :label="t('kensetsu.ltv')"
        :tooltip="t('kensetsu.ltvDescription')"
        :prev="formattedPrevLtv"
        :next="formattedLtv"
      >
        <value-status v-if="ltv" class="ltv-badge-status" badge :value="ltvNumber" :getStatus="getLtvStatus">
          {{ ltvText }}
        </value-status>
      </prev-next-info-line>
      <s-button
        class="s-typography-button--large action-button borrow-more__button"
        type="primary"
        :disabled="disabled"
        @click="handleBorrowMore"
      >
        <template v-if="disabled">{{ errorMessage }}</template>
        <template v-else>{{ title }}</template>
      </s-button>
      <info-line
        :label="t('kensetsu.borrowTax')"
        :label-tooltip="t('kensetsu.borrowTaxDescription', { value: borrowTaxPercent })"
        :value="formattedBorrowTax"
        :asset-symbol="debtSymbol"
        is-formatted
      />
      <info-line
        is-formatted
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
      />
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Operation, FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Ref, Watch } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { LtvTranslations, VaultComponents } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import { getLtvStatus } from '@/modules/vault/util';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { asZeroValue } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/sdk/build/kensetsu/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenInput: lazyComponent(Components.TokenInput),
    ValueStatus: lazyComponent(Components.ValueStatusWrapper),
    PrevNextInfoLine: vaultLazyComponent(VaultComponents.PrevNextInfoLine),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
  },
})
export default class BorrowMoreDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xorSymbol = XOR.symbol;
  readonly getLtvStatus = getLtvStatus;

  @Ref('debtInput') debtInput!: Nullable<TokenInput>;

  @Prop({ type: Object, default: ObjectInit }) readonly vault!: Nullable<Vault>;
  @Prop({ type: Object, default: ObjectInit }) readonly debtAsset!: Nullable<RegisteredAccountAsset>;
  @Prop({ type: Object, default: ObjectInit }) readonly collateral!: Nullable<Collateral>;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly prevLtv!: Nullable<FPNumber>;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly available!: FPNumber;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly maxSafeDebt!: FPNumber;
  @Prop({ type: Number, default: HundredNumber }) readonly maxLtv!: number;
  @Prop({ type: Number, default: 0 }) readonly borrowTax!: number;

  @state.settings.percentFormat private percentFormat!: Nullable<Intl.NumberFormat>;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.settings.slippageTolerance private slippageTolerance!: string;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;

  borrowValue = '';

  @Watch('visible')
  private async handleDialogVisibility(value: boolean): Promise<void> {
    await this.$nextTick();
    this.borrowValue = '';
    this.debtInput?.focus();
  }

  private get xorBalance(): FPNumber {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get title(): string {
    return this.t('kensetsu.borrowMore');
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.CreateVault];
  }

  private get fpNetworkFee(): FPNumber {
    return this.getFPNumberFromCodec(this.networkFee);
  }

  get networkFeeFormatted(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isInsufficientXorForFee(): boolean {
    return this.xorBalance.sub(this.fpNetworkFee).isLtZero();
  }

  get isBorrowZero(): boolean {
    return asZeroValue(this.borrowValue);
  }

  private get borrowFp(): FPNumber {
    if (this.isBorrowZero) return this.Zero;
    return this.getFPNumber(this.borrowValue, this.debtAsset?.decimals);
  }

  private get debtAvailable(): FPNumber {
    return this.collateral?.riskParams.hardCap.sub(this.collateral.debtSupply) ?? this.Zero;
  }

  private get availableOrTotal(): FPNumber {
    return this.available.gt(this.debtAvailable) ? this.debtAvailable : this.available;
  }

  get isBorrowMoreThanAvailable(): boolean {
    return this.borrowFp.gt(this.availableOrTotal);
  }

  get disabled(): boolean {
    return this.loading || this.isInsufficientXorForFee || this.isBorrowZero || this.isBorrowMoreThanAvailable;
  }

  get availableCodec(): CodecString {
    return this.availableOrTotal.dp(FPNumber.DEFAULT_PRECISION).codec;
  }

  get isMaxBorrowAvailable(): boolean {
    if (this.shouldBalanceBeHidden || this.isBorrowZero) return true;
    if (!this.availableOrTotal.isFinity() || this.availableOrTotal.isLteZero()) return false;
    return !this.borrowFp.isEqualTo(this.availableOrTotal);
  }

  get debtSymbol(): string {
    return this.debtAsset?.symbol ?? '';
  }

  get formattedPrevBorrow(): string {
    return this.vault?.debt.toLocaleString() ?? ZeroStringValue;
  }

  private get nextBorrow(): Nullable<FPNumber> {
    const debt = this.vault?.debt;
    if (this.isBorrowZero) return debt;
    return debt?.add(this.borrowValue);
  }

  get formattedNextBorrow(): string {
    return this.nextBorrow?.toLocaleString() ?? ZeroStringValue;
  }

  get formattedPrevLtv(): string {
    return this.prevLtv?.toLocaleString(2) ?? ZeroStringValue;
  }

  private get ltvCoeff(): Nullable<FPNumber> {
    if (!this.nextBorrow) return null;
    return this.nextBorrow.div(this.maxSafeDebt);
  }

  get ltv(): Nullable<FPNumber> {
    return this.ltvCoeff?.isFinity() ? this.ltvCoeff.mul(HundredNumber) : null;
  }

  get ltvNumber(): number {
    if (!this.ltv) return 0;
    return this.ltv.toNumber();
  }

  get formattedLtv(): string {
    if (!this.ltvCoeff) return ZeroStringValue;
    return this.ltvCoeff.mul(this.maxLtv).toLocaleString(2);
  }

  get ltvText(): string {
    return LtvTranslations[getLtvStatus(this.ltvNumber)];
  }

  get borrowTaxPercent(): string {
    return this.percentFormat?.format?.(this.borrowTax) ?? `${this.borrowTax * HundredNumber}%`;
  }

  get formattedBorrowTax(): string {
    return this.borrowFp?.mul(this.borrowTax ?? 0).toLocaleString() ?? ZeroStringValue;
  }

  get borrowValuePercent(): number {
    if (!this.borrowValue) return 0;

    const percent = this.borrowFp.div(this.availableOrTotal).mul(HundredNumber).toNumber(0);
    return percent > HundredNumber ? HundredNumber : percent;
  }

  handleMaxBorrowValue(): void {
    this.borrowValue = this.availableOrTotal.toString();
  }

  handleBorrowPercentChange(percent: number): void {
    this.borrowValue = this.availableOrTotal.mul(percent / HundredNumber).toString();
  }

  get errorMessage(): string {
    let error = '';
    if (this.isInsufficientXorForFee) {
      error = this.t('insufficientBalanceText', { tokenSymbol: this.xorSymbol });
    } else if (this.isBorrowZero) {
      error = this.t('kensetsu.error.enterBorrow');
    } else if (this.isBorrowMoreThanAvailable) {
      error = this.t('kensetsu.error.borrowMoreThanAvailable');
    }
    return error;
  }

  async handleBorrowMore(): Promise<void> {
    if (this.disabled) {
      if (this.errorMessage) {
        this.$alert(this.errorMessage, { title: this.t('errorText') });
      }
    } else {
      try {
        await this.withNotifications(async () => {
          if (!(this.vault && this.debtAsset)) {
            throw new Error('[api.kensetsu.borrow]: vault is null');
          }
          await api.kensetsu.borrow(this.vault, this.borrowValue, this.debtAsset, this.slippageTolerance);
        });
        this.$emit('confirm');
      } catch (error) {
        console.error(error);
      }
    }
    this.isVisible = false;
  }
}
</script>

<style lang="scss" scoped>
.borrow-more {
  @include full-width-button('action-button');

  &__button,
  &__slippage {
    margin-bottom: $inner-spacing-medium;
  }
  &__token-input {
    margin-bottom: $inner-spacing-mini;
  }
  .ltv-badge-status {
    margin-left: $inner-spacing-mini;
  }
}
</style>
