<template>
  <dialog-base :title="title" :visible.sync="isVisible" :tooltip="t('kensetsu.repayDebtDescription')">
    <div class="repay-debt">
      <token-input
        ref="debtInput"
        class="repay-debt__debt-input repay-debt__token-input"
        with-slider
        :title="title"
        v-model="repayDebtValue"
        is-fiat-editable
        :is-max-available="isMaxRepayAvailable"
        :token="kusdToken"
        :balance="debtAssetBalance"
        :slider-value="repayDebtValuePercent"
        :disabled="loading"
        @max="handleMaxRepayDebtValue"
        @slide="handleRepayPercentChange"
      />
      <prev-next-info-line
        :label="t('kensetsu.outstandingDebt')"
        :tooltip="t('kensetsu.outstandingDebtDescription')"
        :symbol="kusdSymbol"
        :prev="formattedPrevBorrow"
        :next="formattedNextBorrow"
      />
      <prev-next-info-line
        :label="t('kensetsu.ltv')"
        :tooltip="t('kensetsu.ltvDescription')"
        symbol="%"
        :prev="formattedPrevLtv"
        :next="formattedLtv"
      >
        <value-status v-if="ltv" class="ltv-badge-status" badge :value="ltvNumber" :getStatus="getLtvStatus">
          {{ ltvText }}
        </value-status>
      </prev-next-info-line>
      <s-button
        type="primary"
        class="s-typography-button--large action-button repay-debt__button"
        :disabled="disabled"
        @click="handleRepayDebt"
      >
        <template v-if="disabled">{{ errorMessage }}</template>
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
import { Operation, FPNumber } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop, Ref, Watch } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { LtvTranslations, VaultComponents } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import { getLtvStatus } from '@/modules/vault/util';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { asZeroValue, getAssetBalance, hasInsufficientBalance } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Vault } from '@sora-substrate/util/build/kensetsu/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenInput: lazyComponent(Components.TokenInput),
    ValueStatus: lazyComponent(Components.ValueStatusWrapper),
    PrevNextInfoLine: vaultLazyComponent(VaultComponents.PrevNextInfoLine),
  },
})
export default class RepayDebtDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xorSymbol = XOR.symbol;
  readonly getLtvStatus = getLtvStatus;

  @Ref('debtInput') debtInput!: Nullable<TokenInput>;

  @Prop({ type: Object, default: ObjectInit }) readonly vault!: Nullable<Vault>;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly prevLtv!: Nullable<FPNumber>;
  @Prop({ type: Object, default: () => FPNumber.ZERO }) readonly maxSafeDebt!: FPNumber;
  @Prop({ type: Number, default: HundredNumber }) readonly maxLtv!: number;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;
  @getter.vault.kusdToken kusdToken!: Nullable<RegisteredAccountAsset>;

  repayDebtValue = '';

  @Watch('visible')
  private async handleDialogVisibility(value: boolean): Promise<void> {
    await this.$nextTick();
    this.repayDebtValue = '';
    this.debtInput?.focus();
  }

  private get xorBalance(): FPNumber {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get title(): string {
    return this.t('kensetsu.repayDebt');
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

  get isRepayDebtZero(): boolean {
    return asZeroValue(this.repayDebtValue);
  }

  private get repayDebtFp(): FPNumber {
    if (this.isRepayDebtZero) return this.Zero;
    return this.getFPNumber(this.repayDebtValue);
  }

  get isRepayMoreThanDebt(): boolean {
    return this.debt.lt(this.repayDebtFp);
  }

  get isInsufficientBalance(): boolean {
    if (!this.kusdToken) return true;
    return hasInsufficientBalance(this.kusdToken, this.repayDebtValue, this.networkFee);
  }

  get disabled(): boolean {
    return (
      this.loading ||
      this.isInsufficientXorForFee ||
      this.isRepayDebtZero ||
      this.isRepayMoreThanDebt ||
      this.isInsufficientBalance
    );
  }

  get debtAssetBalance(): CodecString {
    return getAssetBalance(this.kusdToken);
  }

  private get debtAssetBalanceFp(): FPNumber {
    return this.getFPNumberFromCodec(this.debtAssetBalance, this.kusdToken?.decimals);
  }

  private get debt(): FPNumber {
    return this.vault?.debt ?? this.Zero;
  }

  get isMaxRepayAvailable(): boolean {
    if (this.shouldBalanceBeHidden || this.isRepayDebtZero) return true;
    if (!this.debt.isFinity() || this.debt.isLteZero()) return false;
    return !this.repayDebtFp.isEqualTo(this.debt);
  }

  get kusdSymbol(): string {
    return this.kusdToken?.symbol ?? '';
  }

  get formattedPrevBorrow(): string {
    return this.vault?.debt.toLocaleString() ?? ZeroStringValue;
  }

  private get nextBorrow(): Nullable<FPNumber> {
    const debt = this.vault?.debt;
    if (this.isRepayDebtZero) return debt;
    const diff = debt?.sub(this.repayDebtValue);
    return diff?.isGteZero() ? diff : this.Zero;
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

  /**
   * It's required for max & slider to realize what value should be used
   * as maximum. When debt is lower than balance debt should be used.
   * Otherwise, balance.
   */
  private get maxInputRepay(): FPNumber {
    return this.debt.gt(this.debtAssetBalanceFp) ? this.debtAssetBalanceFp : this.debt;
  }

  get repayDebtValuePercent(): number {
    if (!this.repayDebtValue) return 0;

    const percent = this.repayDebtFp.div(this.maxInputRepay).mul(HundredNumber).toNumber(0);
    return percent > HundredNumber ? HundredNumber : percent;
  }

  handleMaxRepayDebtValue(): void {
    this.repayDebtValue = this.maxInputRepay.toString();
  }

  handleRepayPercentChange(percent: number): void {
    this.repayDebtValue = this.maxInputRepay.mul(percent / HundredNumber).toString();
  }

  get errorMessage(): string {
    let error = '';
    if (this.isInsufficientXorForFee) {
      error = this.t('insufficientBalanceText', { tokenSymbol: this.xorSymbol });
    } else if (this.isRepayDebtZero) {
      error = this.t('kensetsu.error.enterRepayDebt');
    } else if (this.isRepayMoreThanDebt) {
      error = this.t('kensetsu.error.repayMoreThanDebt');
    } else if (this.isInsufficientBalance) {
      error = this.t('insufficientBalanceText', { tokenSymbol: this.kusdSymbol });
    }
    return error;
  }

  async handleRepayDebt(): Promise<void> {
    if (this.disabled) {
      if (this.errorMessage) {
        this.$alert(this.errorMessage, { title: this.t('errorText') });
      }
    } else {
      try {
        await this.withNotifications(async () => {
          if (!this.vault) throw new Error('[api.kensetsu.repayVaultDebt]: vault is null');
          await api.kensetsu.repayVaultDebt(this.vault, this.repayDebtValue);
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
.repay-debt {
  @include full-width-button('action-button');

  &__button,
  &__token-input {
    margin-bottom: $inner-spacing-medium;
  }
  .ltv-badge-status {
    margin-left: $inner-spacing-mini;
  }
}
</style>
