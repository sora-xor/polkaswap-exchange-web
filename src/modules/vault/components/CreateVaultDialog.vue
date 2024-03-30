<template>
  <div>
    <dialog-base :title="title" :visible.sync="isVisible" tooltip="COMING SOON...">
      <div class="vault-create">
        <token-input
          ref="collateralInput"
          class="vault-create__collateral-input vault-create__token-input"
          with-slider
          is-select-available
          title="DEPOSIT COLLATERAL"
          v-model="collateralValue"
          is-fiat-editable
          :is-max-available="isMaxCollateralAvailable"
          :token="collateralToken"
          :balance="collateralAssetBalance"
          :slider-value="collateralValuePercent"
          :disabled="loading"
          @max="handleMaxCollateralValue"
          @slide="handleCollateralPercentChange"
          @select="openSelectTokenDialog"
        />
        <token-input
          ref="debtInput"
          class="vault-create__debt-input vault-create__token-input"
          with-slider
          title="BORROW DEBT"
          v-model="borrowValue"
          is-fiat-editable
          :is-max-available="isMaxBorrowAvailable"
          :token="kusdToken"
          :slider-value="borrowValuePercent"
          :disabled="loading"
          :max="maxBorrowPerMaxCollateralNumber"
          @max="handleMaxBorrowValue"
          @slide="handleBorrowPercentChange"
        />
        <info-line
          label="MIN DEPOSIT COLLATERAL"
          label-tooltip="COMING SOON..."
          :value="formattedMinDeposit"
          :asset-symbol="collateralSymbol"
          :fiat-value="minDepositFiat"
          is-formatted
        />
        <info-line
          label="MAX AVAILABLE TO BORROW"
          label-tooltip="COMING SOON..."
          :value="formattedMaxBorrow"
          :asset-symbol="kusdSymbol"
          :fiat-value="maxBorrowFiat"
          is-formatted
        />
        <info-line
          label="LOAN TO VALUE (LTV)"
          label-tooltip="COMING SOON..."
          :value="formattedLtv"
          asset-symbol="%"
          is-formatted
        >
          <value-status v-if="ltv" class="ltv-badge-status" badge :value="ltvNumber" :getStatus="getLtvStatus">
            {{ ltvText }}
          </value-status>
        </info-line>
        <info-line
          label="STABILITY FEE"
          label-tooltip="COMING SOON..."
          :value="formattedStabilityFee"
          asset-symbol="%"
          is-formatted
        />
        <s-button
          type="primary"
          class="s-typography-button--large action-button vault-create__button"
          :disabled="disabled"
          @click="handleCreate"
        >
          <template v-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
          </template>
          <template v-else-if="!ltv">ENTER COLLATERAL</template>
          <template v-else-if="isLessThanMinDeposit">ENTER MORE COLLATERAL</template>
          <template v-else-if="isLtvGtHundred">INSUFFICIENT COLLATERAL</template>
          <template v-else>OPEN</template>
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

    <select-token
      disabled-custom
      :visible.sync="showSelectTokenDialog"
      :connected="isLoggedIn"
      :filter="selectTokenFilter"
      :asset="collateralToken"
      @select="handleSelectToken"
    />
  </div>
</template>

<script lang="ts">
import { Operation, FPNumber } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins, components, api } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Ref, Watch } from 'vue-property-decorator';

import type TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Components, HundredNumber, ZeroStringValue } from '@/consts';
import { LtvTranslations } from '@/modules/vault/consts';
import { getLtvStatus } from '@/modules/vault/util';
import { lazyComponent } from '@/router';
import { getter, state, action } from '@/store/decorators';
import { asZeroValue, getAssetBalance } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/util';
import type { AccountAsset, Asset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral } from '@sora-substrate/util/build/kensetsu/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenInput: lazyComponent(Components.TokenInput),
    SelectToken: lazyComponent(Components.SelectToken),
    ValueStatus: lazyComponent(Components.ValueStatusWrapper),
  },
})
export default class CreateVaultDialog extends Mixins(
  mixins.TransactionMixin,
  mixins.DialogMixin,
  mixins.FormattedAmountMixin
) {
  readonly xorSymbol = XOR.symbol;
  readonly getLtvStatus = getLtvStatus;

  @Ref('collateralInput') collateralInput!: Nullable<TokenInput>;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.vault.collaterals private collaterals!: Record<string, Collateral>;
  @getter.vault.averageCollateralPrice private averageCollateralPrice!: Nullable<FPNumber>;
  @getter.assets.xor private accountXor!: Nullable<AccountAsset>;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  @getter.vault.kusdToken kusdToken!: Nullable<RegisteredAccountAsset>;
  @getter.vault.collateralToken collateralToken!: Nullable<RegisteredAccountAsset>;

  @action.vault.setCollateralTokenAddress private setCollateralAddress!: (address?: string) => Promise<void>;

  collateralValue = '';
  borrowValue = '';
  showSelectTokenDialog = false;

  @Watch('visible')
  private async handleDialogVisibility(value: boolean): Promise<void> {
    await this.$nextTick();
    this.collateralValue = '';
    this.borrowValue = '';
    this.setCollateralAddress();
    this.showSelectTokenDialog = false;
    this.collateralInput?.focus();
  }

  private get collateral(): Nullable<Collateral> {
    if (!this.collateralToken) return null;
    return this.collaterals[this.collateralToken.address];
  }

  private get xorBalance(): FPNumber {
    return this.getFPNumberFromCodec(this.accountXor?.balance?.transferable ?? ZeroStringValue);
  }

  get title(): string {
    return 'Open a borrow position';
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

  get isLtvGtHundred(): boolean {
    return this.ltv?.gt(this.Hundred) ?? false;
  }

  get isLessThanMinDeposit(): boolean {
    if (!this.collateralValue) return true;
    const collateralFp = this.getFPNumber(this.collateralValue, this.collateralToken?.decimals);
    return collateralFp.lt(this.collateral?.riskParams.minDeposit);
  }

  get disabled(): boolean {
    return (
      this.loading ||
      this.isInsufficientXorForFee ||
      this.isLessThanMinDeposit ||
      !this.ltv ||
      this.ltv.gt(this.Hundred)
    );
  }

  get collateralAssetBalance(): CodecString {
    return getAssetBalance(this.collateralToken);
  }

  /** If collateral is XOR then we subtract the network fee */
  private get availableCollateralBalanceFp(): FPNumber {
    let availableCollateralBalance = this.getFPNumberFromCodec(this.collateralAssetBalance);
    if (this.collateralToken?.address === XOR.address) {
      availableCollateralBalance = availableCollateralBalance.sub(this.fpNetworkFee);
      if (availableCollateralBalance.isLtZero()) {
        availableCollateralBalance = this.Zero;
      }
    }
    return availableCollateralBalance;
  }

  get isMaxCollateralAvailable(): boolean {
    if (this.shouldBalanceBeHidden || asZeroValue(this.collateralValue)) return true;
    if (this.availableCollateralBalanceFp.isLteZero()) return false;
    return !this.getFPNumber(this.collateralValue).isEqualTo(this.availableCollateralBalanceFp);
  }

  get collateralValuePercent(): number {
    if (!this.collateralValue) return 0;

    const percent = this.getFPNumber(this.collateralValue, this.collateralToken?.decimals)
      .div(this.availableCollateralBalanceFp)
      .mul(HundredNumber)
      .toNumber(0);
    return percent > HundredNumber ? HundredNumber : percent;
  }

  private get collateralTokenIds(): string[] {
    return Object.keys(this.collaterals);
  }

  get selectTokenFilter(): (value: AccountAsset) => boolean {
    return (value: AccountAsset) => this.collateralTokenIds.includes(value?.address);
  }

  get isMaxBorrowAvailable(): boolean {
    if (asZeroValue(this.collateralValue)) return false;
    if (this.shouldBalanceBeHidden || asZeroValue(this.borrowValue)) return true;
    if (!this.maxBorrowPerCollateralValue.isFinity() || this.maxBorrowPerCollateralValue.isLteZero()) return false;
    return !this.getFPNumber(this.borrowValue).isEqualTo(this.maxBorrowPerCollateralValue);
  }

  get kusdSymbol(): string {
    return this.kusdToken?.symbol ?? '';
  }

  get collateralSymbol(): string {
    return this.collateralToken?.symbol ?? '';
  }

  get maxBorrowPerMaxCollateralNumber(): number {
    return this.maxBorrowPerMaxCollateralFp.toNumber();
  }

  private get maxBorrowPerMaxCollateralFp(): FPNumber {
    if (
      !this.averageCollateralPrice ||
      !this.availableCollateralBalanceFp.isFinity() ||
      this.availableCollateralBalanceFp.isZero()
    )
      return this.Zero;

    const collateralVolume = this.averageCollateralPrice.mul(this.availableCollateralBalanceFp);
    const maxSafeDebt = collateralVolume
      .mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0)
      .div(HundredNumber);

    return maxSafeDebt;
  }

  get formattedMinDeposit(): string {
    return this.collateral?.riskParams.minDeposit.toLocaleString() ?? ZeroStringValue;
  }

  get minDepositFiat(): Nullable<string> {
    if (!(this.collateralToken && this.collateral?.riskParams.minDeposit)) return null;
    return this.getFiatAmountByFPNumber(this.collateral.riskParams.minDeposit, this.collateralToken);
  }

  get formattedMaxBorrow(): string {
    return this.maxBorrowPerMaxCollateralFp.toLocaleString();
  }

  get maxBorrowFiat(): Nullable<string> {
    if (!this.kusdToken) return null;
    return this.getFiatAmountByFPNumber(this.maxBorrowPerMaxCollateralFp, this.kusdToken);
  }

  private get maxBorrowPerCollateralValue(): FPNumber {
    if (!this.averageCollateralPrice || asZeroValue(this.collateralValue)) return this.Zero;

    const collateralVolume = this.averageCollateralPrice.mul(this.collateralValue);
    const maxSafeDebt = collateralVolume
      .mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0)
      .div(HundredNumber);
    return maxSafeDebt;
  }

  get ltv(): Nullable<FPNumber> {
    if (asZeroValue(this.collateralValue)) return null;
    if (asZeroValue(this.borrowValue)) return this.Zero;
    const ltv = this.getFPNumber(this.borrowValue).div(this.maxBorrowPerCollateralValue);
    return ltv.isFinity() ? ltv.mul(HundredNumber) : null;
  }

  get ltvNumber(): number {
    if (!this.ltv) return 0;
    return this.ltv.toNumber();
  }

  get formattedLtv(): string {
    if (!this.ltv) return ZeroStringValue;
    return this.ltv.toLocaleString(2);
  }

  get ltvText(): string {
    return LtvTranslations[getLtvStatus(this.ltvNumber)];
  }

  get formattedStabilityFee(): string {
    return (this.collateral?.riskParams.rateAnnual ?? this.Zero).toLocaleString();
  }

  get borrowValuePercent(): number {
    if (!this.borrowValue) return 0;

    const percent = this.getFPNumber(this.borrowValue, this.kusdToken?.decimals)
      .div(this.maxBorrowPerCollateralValue)
      .mul(HundredNumber)
      .toNumber(0);
    return percent > HundredNumber ? HundredNumber : percent;
  }

  handleCollateralPercentChange(percent: number): void {
    this.collateralValue = this.availableCollateralBalanceFp.mul(percent / HundredNumber).toString();
  }

  handleMaxCollateralValue(): void {
    this.collateralValue = this.availableCollateralBalanceFp.toString();
  }

  handleMaxBorrowValue(): void {
    this.borrowValue = this.maxBorrowPerCollateralValue.toString();
  }

  handleBorrowPercentChange(percent: number): void {
    this.borrowValue = this.maxBorrowPerCollateralValue.mul(percent / HundredNumber).toString();
  }

  /**
   * `isDebtToken` is set for the future when debt token might be selected as well
   */
  openSelectTokenDialog(isDebtToken = false): void {
    this.showSelectTokenDialog = true;
  }

  handleSelectToken(token: Asset): void {
    this.setCollateralAddress(token?.address);
    this.collateralValue = '';
    this.borrowValue = '';
  }

  async handleCreate(): Promise<void> {
    if (this.disabled) {
      if (this.isInsufficientXorForFee) {
        this.$alert(this.t('insufficientBalanceText', { tokenSymbol: this.xorSymbol }), {
          title: this.t('errorText'),
        });
      } else if (!this.ltv || this.isLessThanMinDeposit || this.isLtvGtHundred) {
        this.$alert('Insufficient collateral', {
          title: this.t('errorText'),
        });
      }
    } else {
      try {
        const token = this.collateralToken;
        if (!token) return;
        await this.withNotifications(async () => {
          await api.kensetsu.createVault(token, this.collateralValue, this.borrowValue);
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
.vault-create {
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
