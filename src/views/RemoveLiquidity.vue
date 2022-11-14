<template>
  <div v-loading="parentLoading" class="container container--remove-liquidity">
    <generic-page-header
      has-button-back
      :title="t('removeLiquidity.title')"
      :tooltip="t('removeLiquidity.description')"
      @back="handleBack"
    />
    <s-form class="el-form--actions" :show-message="false">
      <s-float-input
        ref="removePart"
        size="medium"
        :class="['s-input--token-value', 's-input--remove-part', removePartCharClass]"
        :value="String(removePartInput)"
        :decimals="0"
        :disabled="liquidityLocked"
        :max="MAX_PART"
        @input="handleRemovePartChange"
        @focus="setFocusedField('removePart')"
        @blur="resetFocusedField"
      >
        <div slot="top" class="amount">{{ t('removeLiquidity.amount') }}</div>
        <div slot="right" class="el-buttons el-buttons--between">
          <span class="percent">%</span>
          <s-button
            v-if="isMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click.stop="handleRemovePartChange(MAX_PART)"
          >
            {{ t('buttons.max') }}
          </s-button>
        </div>
        <div slot="bottom">
          <s-slider
            class="slider-container"
            :value="removePartInput"
            :disabled="liquidityLocked"
            :showTooltip="false"
            @change="handleRemovePartChange"
          />
          <div v-if="hasLockedPart" class="input-line input-line--footer locked-part">
            {{ t('removeLiquidity.locked', { percent: liquidityBalanceLockedPercent }) }}
          </div>
        </div>
      </s-float-input>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />

      <token-input
        :disabled="liquidityLocked"
        :max="getTokenMaxAmount(firstTokenBalance)"
        :title="t('removeLiquidity.output')"
        :token="firstToken"
        :value="firstTokenAmount"
        @input="setFirstTokenAmount"
        @focus="setFocusedField('firstTokenAmount')"
        @blur="resetFocusedField"
      >
        <template #balance>-</template>
      </token-input>

      <s-icon class="icon-divider" name="plus-16" />

      <token-input
        :disabled="liquidityLocked"
        :max="getTokenMaxAmount(secondTokenBalance)"
        :title="t('removeLiquidity.output')"
        :token="secondToken"
        :value="secondTokenAmount"
        @input="setSecondTokenAmount"
        @focus="setFocusedField('secondTokenAmount')"
        @blur="resetFocusedField"
      >
        <template #balance>-</template>
      </token-input>

      <slippage-tolerance class="slippage-tolerance-settings" />

      <s-button
        type="primary"
        class="action-button s-typography-button--large"
        border-radius="small"
        :disabled="liquidityLocked || isEmptyAmount || isInsufficientBalance || isInsufficientXorForFee"
        @click="handleRemoveLiquidity"
      >
        <template v-if="isEmptyAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance', { tokenSymbol: t('removeLiquidity.liquidity') }) }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('exchange.insufficientBalance', { tokenSymbol: XOR_SYMBOL }) }}
        </template>
        <template v-else>
          {{ t('removeLiquidity.remove') }}
        </template>
      </s-button>

      <remove-liquidity-transaction-details
        class="info-line-container"
        v-if="price || priceReversed || networkFee || shareOfPool"
        :info-only="false"
      />
    </s-form>

    <confirm-remove-liquidity
      :visible.sync="showConfirmDialog"
      :parent-loading="parentLoading"
      @confirm="handleConfirmRemoveLiquidity"
    />

    <network-fee-warning-dialog
      :visible.sync="showWarningFeeDialog"
      :fee="formattedFee"
      @confirm="confirmNetworkFeeWariningDialog"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, CodecString, Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { hasInsufficientXorForFee } from '@/utils';
import { getter, state, mutation, action } from '@/store/decorators';
import type { LiquidityParams } from '@/store/pool/types';
import type { PricesPayload } from '@/store/prices/types';
import type { FocusedField } from '@/store/removeLiquidity/types';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmRemoveLiquidity: lazyComponent(Components.ConfirmRemoveLiquidity),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    RemoveLiquidityTransactionDetails: lazyComponent(Components.RemoveLiquidityTransactionDetails),
    TokenInput: lazyComponent(Components.TokenInput),
    InfoLine: components.InfoLine,
  },
})
export default class RemoveLiquidity extends Mixins(
  mixins.NetworkFeeWarningMixin,
  mixins.FormattedAmountMixin,
  mixins.TransactionMixin,
  ConfirmDialogMixin,
  NetworkFeeDialogMixin
) {
  readonly XOR_SYMBOL = XOR.symbol;
  readonly MAX_PART = 100;

  @state.removeLiquidity.liquidityAmount private liquidityAmount!: string;
  @state.removeLiquidity.focusedField private focusedField!: string;
  @state.removeLiquidity.firstTokenAmount firstTokenAmount!: string;
  @state.removeLiquidity.secondTokenAmount secondTokenAmount!: string;
  @state.removeLiquidity.removePart removePart!: number;
  @state.prices.price price!: string;
  @state.prices.priceReversed priceReversed!: string;

  @getter.assets.xor private xor!: Nullable<AccountAsset>;
  @getter.removeLiquidity.liquidityBalanceFull private liquidityBalanceFull!: FPNumber;
  @getter.removeLiquidity.liquidityBalance private liquidityBalance!: FPNumber;
  @getter.removeLiquidity.liquidity liquidity!: AccountLiquidity;
  @getter.removeLiquidity.firstToken firstToken!: Asset;
  @getter.removeLiquidity.secondToken secondToken!: Asset;
  @getter.removeLiquidity.firstTokenBalance firstTokenBalance!: FPNumber;
  @getter.removeLiquidity.secondTokenBalance secondTokenBalance!: FPNumber;
  @getter.removeLiquidity.shareOfPool shareOfPool!: string;

  @mutation.removeLiquidity.setFocusedField setFocusedField!: (field: FocusedField) => void;
  @mutation.removeLiquidity.resetFocusedField resetFocusedField!: VoidFunction;

  @action.removeLiquidity.setRemovePart private setRemovePart!: (removePart: number) => Promise<void>;
  @action.removeLiquidity.setLiquidity private setLiquidity!: (args: LiquidityParams) => Promise<void>;
  @action.removeLiquidity.removeLiquidity private removeLiquidity!: AsyncVoidFn;
  @action.removeLiquidity.resetData private resetData!: AsyncVoidFn;
  @action.removeLiquidity.setFirstTokenAmount setFirstTokenAmount!: (amount: string) => Promise<void>;
  @action.removeLiquidity.setSecondTokenAmount setSecondTokenAmount!: (amount: string) => Promise<void>;

  @mutation.prices.resetPrices private resetPrices!: VoidFunction;
  @action.prices.getPrices private getPrices!: (options?: PricesPayload) => Promise<void>;

  @Watch('removePart')
  private removePartChange(newValue: number): void {
    this.handleRemovePartChange(String(newValue));
  }

  @Watch('liquidity')
  private liquidityChange(): void {
    this.updatePrices();

    switch (this.focusedField) {
      case 'firstTokenAmount':
      case 'secondTokenAmount': {
        const isFirstToken = this.focusedField === 'firstTokenAmount';

        const balance = Number(this.getTokenMaxAmount(isFirstToken ? this.firstTokenBalance : this.secondTokenBalance));
        const amount = Number(isFirstToken ? this.firstTokenAmount : this.secondTokenAmount);

        const setValue = isFirstToken ? this.setFirstTokenAmount : this.setSecondTokenAmount;
        const value = String(Number.isFinite(balance) ? Math.min(balance, amount) : amount);

        setValue(value);
        break;
      }
      default: {
        this.handleRemovePartChange(String(this.removePart));
        break;
      }
    }
  }

  removePartInput = 0;
  sliderInput: any;
  sliderDragButton: any;

  async mounted(): Promise<void> {
    await this.withParentLoading(async () => {
      await this.setLiquidity({
        firstAddress: this.firstTokenAddress,
        secondAddress: this.secondTokenAddress,
      });
      // If user don't have the liquidity (navigated through the address bar) redirect to the Pool page
      if (!this.liquidity) {
        return this.handleBack();
      }
      this.updatePrices();
      this.addListenerToSliderDragButton();
    });
  }

  beforeDestroy(): void {
    this.removeListenerFromSliderDragButton();
    this.resetData();
    this.resetPrices();
  }

  get firstTokenAddress(): string {
    return this.$route.params.firstAddress;
  }

  get secondTokenAddress(): string {
    return this.$route.params.secondAddress;
  }

  get isEmptyAmount(): boolean {
    // We don't check removePart for less than 1%
    return !Number(this.liquidityAmount) || !this.firstTokenAmount || !this.secondTokenAmount;
  }

  get liquidityLocked(): boolean {
    return this.liquidityBalance.isZero();
  }

  get hasLockedPart(): boolean {
    return FPNumber.isLessThan(this.liquidityBalance, this.liquidityBalanceFull);
  }

  get liquidityBalanceLockedPercent() {
    return (
      this.liquidityBalanceFull
        .sub(this.liquidityBalance)
        .div(this.liquidityBalanceFull)
        .mul(FPNumber.HUNDRED)
        .toLocaleString() + '%'
    );
  }

  get isInsufficientBalance(): boolean {
    const { liquidityBalance, firstTokenBalance, secondTokenBalance } = this;
    const amount = this.getFPNumber(this.liquidityAmount);
    const firstTokenAmount = this.getFPNumber(this.firstTokenAmount);
    const secondTokenAmount = this.getFPNumber(this.secondTokenAmount);
    return (
      FPNumber.gt(amount, liquidityBalance) ||
      FPNumber.gt(firstTokenAmount, firstTokenBalance) ||
      FPNumber.gt(secondTokenAmount, secondTokenBalance)
    );
  }

  get isInsufficientXorForFee(): boolean {
    return !!this.xor && hasInsufficientXorForFee(this.xor, this.networkFee);
  }

  get removePartCharClass(): string {
    const charClassName =
      {
        3: 'three',
        2: 'two',
      }[this.removePartInput.toString().length] ?? 'one';

    return `${charClassName}-char`;
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.RemoveLiquidity];
  }

  get formattedFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isXorSufficientForNextOperation(): boolean {
    return this.isXorSufficientForNextTx({
      type: Operation.RemoveLiquidity,
    });
  }

  get isMaxButtonAvailable(): boolean {
    return this.removePart !== this.MAX_PART;
  }

  handleRemovePartChange(value: string): void {
    const newValue = parseFloat(value) || 0;
    this.removePartInput = Math.min(Math.max(newValue, 0), this.MAX_PART);
    this.setRemovePart(this.removePartInput);
  }

  focusSliderInput(): void {
    this.setFocusedField('removePart');
    if (this.sliderInput) {
      this.sliderInput.focus();
    }
  }

  getTokenMaxAmount(tokenBalance: FPNumber): string {
    return tokenBalance.toString();
  }

  private updatePrices(): void {
    const { firstTokenBalance, secondTokenBalance } = this;
    this.getPrices({
      assetAAddress: this.firstTokenAddress ?? this.firstToken.address,
      assetBAddress: this.secondTokenAddress ?? this.secondToken.address,
      amountA: firstTokenBalance.toString(),
      amountB: secondTokenBalance.toString(),
    });
  }

  async handleTokenChange(value: string, setValue: (v: any) => Promise<any>): Promise<any> {
    await setValue(value);
  }

  async handleConfirmRemoveLiquidity(): Promise<void> {
    await this.handleConfirmDialog(async () => {
      await this.withNotifications(this.removeLiquidity);
      this.handleBack();
    });
  }

  handleBack(): void {
    if (router.currentRoute.name === PageNames.RemoveLiquidity) {
      router.push({ name: PageNames.Pool });
    }
  }

  async handleRemoveLiquidity(): Promise<void> {
    if (!this.isXorSufficientForNextOperation) {
      this.openWarningFeeDialog();
      await this.waitOnNextTxFailureConfirmation();
      if (!this.isWarningFeeDialogConfirmed) {
        return;
      }
      this.isWarningFeeDialogConfirmed = false;
    }
    this.openConfirmDialog();
  }

  private addListenerToSliderDragButton(): void {
    this.sliderDragButton = this.$el.querySelector('.slider-container .el-slider__button');
    this.sliderInput = this.$el.querySelector('.s-input--remove-part .el-input__inner');

    if (this.sliderDragButton) {
      this.sliderDragButton.addEventListener('mousedown', this.focusSliderInput);
    }
  }

  private removeListenerFromSliderDragButton(): void {
    if (this.sliderDragButton) {
      this.$el.removeEventListener('mousedown', this.sliderDragButton);
    }
  }
}
</script>

<style lang="scss" scoped>
.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');
}

@include vertical-divider('icon-divider', $inner-spacing-medium);

.amount {
  line-height: var(--s-line-height-big);
  font-weight: 600;
}

.locked-part {
  color: var(--s-color-base-content-secondary);
  text-transform: uppercase;
}
</style>

<style lang="scss">
.s-input.s-input--remove-part.s-input--token-value {
  @include input-slider;
}
</style>
