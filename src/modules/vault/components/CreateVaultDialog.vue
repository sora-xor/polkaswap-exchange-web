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
        <slippage-tolerance class="slippage-tolerance-settings vault-create__slippage" />
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
          <template v-else-if="isInsufficientBalance">
            {{ t('insufficientBalanceText', { tokenSymbol: collateralSymbol }) }}
          </template>
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
import { asZeroValue, getAssetBalance, hasInsufficientBalance } from '@/utils';

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
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
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
  @state.settings.slippageTolerance private slippageTolerance!: string;
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

  private get minDeposit(): FPNumber {
    return this.collateral?.riskParams.minDeposit ?? this.Zero;
  }

  private get isCollateralZero(): boolean {
    return asZeroValue(this.collateralValue);
  }

  private get isBorrowZero(): boolean {
    return asZeroValue(this.borrowValue);
  }

  private get collateralValueFp(): FPNumber {
    if (this.isCollateralZero) return this.Zero;
    return this.getFPNumber(this.collateralValue, this.collateralToken?.decimals);
  }

  private get borrowValueFp(): FPNumber {
    if (this.isBorrowZero) return this.Zero;
    return this.getFPNumber(this.borrowValue, this.kusdToken?.decimals);
  }

  get isInsufficientBalance(): boolean {
    if (!this.collateralToken) return true;
    return hasInsufficientBalance(this.collateralToken, this.collateralValue, this.networkFee);
  }

  get isLessThanMinDeposit(): boolean {
    if (!this.collateralValue) return true;
    return this.collateralValueFp.lt(this.minDeposit);
  }

  get disabled(): boolean {
    return (
      this.loading ||
      this.isInsufficientXorForFee ||
      this.isLessThanMinDeposit ||
      this.isInsufficientBalance ||
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
    if (this.shouldBalanceBeHidden || this.isCollateralZero) return true;
    if (this.availableCollateralBalanceFp.isLteZero()) return false;
    return !this.collateralValueFp.isEqualTo(this.availableCollateralBalanceFp);
  }

  get collateralValuePercent(): number {
    if (!this.collateralValue) return 0;

    const percent = this.collateralValueFp.div(this.availableCollateralBalanceFp).mul(HundredNumber).toNumber(0);
    return percent > HundredNumber ? HundredNumber : percent;
  }

  private get collateralTokenIds(): string[] {
    return Object.keys(this.collaterals);
  }

  get selectTokenFilter(): (value: AccountAsset) => boolean {
    return (value: AccountAsset) => this.collateralTokenIds.includes(value?.address);
  }

  get isMaxBorrowAvailable(): boolean {
    if (this.isCollateralZero) return false;
    if (this.shouldBalanceBeHidden || this.isBorrowZero) return true;
    if (!this.maxBorrowPerCollateralValue.isFinity() || this.maxBorrowPerCollateralValue.isLteZero()) return false;
    return !this.borrowValueFp.isEqualTo(this.maxBorrowPerCollateralValue);
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
    return this.minDeposit.toLocaleString() ?? ZeroStringValue;
  }

  get minDepositFiat(): Nullable<string> {
    if (!this.collateralToken) return null;
    return this.getFiatAmountByFPNumber(this.minDeposit, this.collateralToken);
  }

  get formattedMaxBorrow(): string {
    return this.maxBorrowPerMaxCollateralFp.toLocaleString();
  }

  get maxBorrowFiat(): Nullable<string> {
    if (!this.kusdToken) return null;
    return this.getFiatAmountByFPNumber(this.maxBorrowPerMaxCollateralFp, this.kusdToken);
  }

  private get maxBorrowPerCollateralValue(): FPNumber {
    if (!this.averageCollateralPrice || this.isCollateralZero) return this.Zero;

    const collateralVolume = this.averageCollateralPrice.mul(this.collateralValue);
    const maxSafeDebt = collateralVolume
      .mul(this.collateral?.riskParams.liquidationRatioReversed ?? 0)
      .div(HundredNumber);
    return maxSafeDebt;
  }

  get ltv(): Nullable<FPNumber> {
    if (this.isCollateralZero) return null;
    if (this.isBorrowZero) return this.Zero;
    const ltv = this.borrowValueFp.div(this.maxBorrowPerCollateralValue);
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

    const percent = this.borrowValueFp.div(this.maxBorrowPerCollateralValue).mul(HundredNumber).toNumber(0);
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
          await api.kensetsu.createVault(token, this.collateralValue, this.borrowValue, this.slippageTolerance);
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
  &__token-input,
  &__slippage {
    margin-bottom: $inner-spacing-medium;
  }
  .ltv-badge-status {
    margin-left: $inner-spacing-mini;
  }
}
</style>