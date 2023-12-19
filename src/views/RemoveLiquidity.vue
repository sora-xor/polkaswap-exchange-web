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
        :class="['s-input--token-value', 's-input--with-slider', removePartCharClass]"
        :value="removePart"
        :decimals="0"
        :disabled="liquidityLocked"
        :max="MAX_PART"
        @input="handleRemovePartChange"
        @focus="setFocusedField(FocusedField.Percent)"
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
            :value="sliderValue"
            :disabled="liquidityLocked"
            :show-tooltip="false"
            @input="handleRemovePartChange"
          />
          <div v-for="{ percent, lock } in locks" :key="lock" class="input-line input-line--footer locked-part">
            <span class="locked-part-percent">{{ percent }}</span> {{ t('removeLiquidity.locked', { lock }) }}
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
        @focus="setFocusedField(FocusedField.First)"
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
        @focus="setFocusedField(FocusedField.Second)"
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
          {{ t('insufficientBalanceText', { tokenSymbol: t('removeLiquidity.liquidity') }) }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: XOR_SYMBOL }) }}
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

    <remove-liquidity-confirm
      :visible.sync="showConfirmDialog"
      :parent-loading="parentLoading || loading"
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
import { FPNumber, CodecString, Operation } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import InputSliderMixin from '@/components/mixins/InputSliderMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';
import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import { Components, PageNames } from '@/consts';
import router, { lazyComponent } from '@/router';
import { getter, state, mutation, action } from '@/store/decorators';
import type { LiquidityParams } from '@/store/pool/types';
import { FocusedField } from '@/store/removeLiquidity/types';
import { hasInsufficientXorForFee, formatDecimalPlaces } from '@/utils';

import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

@Component({
  components: {
    RemoveLiquidityConfirm: lazyComponent(Components.RemoveLiquidityConfirm),
    RemoveLiquidityTransactionDetails: lazyComponent(Components.RemoveLiquidityTransactionDetails),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenInput: lazyComponent(Components.TokenInput),
    InfoLine: components.InfoLine,
  },
})
export default class RemoveLiquidity extends Mixins(
  mixins.NetworkFeeWarningMixin,
  mixins.FormattedAmountMixin,
  mixins.TransactionMixin,
  ConfirmDialogMixin,
  NetworkFeeDialogMixin,
  SelectedTokenRouteMixin,
  InputSliderMixin
) {
  readonly XOR_SYMBOL = XOR.symbol;
  readonly MAX_PART = 100;
  readonly FocusedField = FocusedField;

  @state.removeLiquidity.liquidityAmount private liquidityAmount!: string;
  @state.removeLiquidity.focusedField private focusedField!: string;
  @state.removeLiquidity.firstTokenAmount firstTokenAmount!: string;
  @state.removeLiquidity.secondTokenAmount secondTokenAmount!: string;
  @state.removeLiquidity.removePart removePart!: string;

  @getter.assets.xor private xor!: Nullable<AccountAsset>;
  @getter.removeLiquidity.liquidityBalanceFull private liquidityBalanceFull!: FPNumber;
  @getter.removeLiquidity.liquidityBalance private liquidityBalance!: FPNumber;
  @getter.removeLiquidity.demeterLockedBalance private demeterLockedBalance!: FPNumber;
  @getter.removeLiquidity.ceresLockedBalance private ceresLockedBalance!: FPNumber;
  @getter.removeLiquidity.liquidity liquidity!: AccountLiquidity;
  @getter.removeLiquidity.firstToken firstToken!: Asset;
  @getter.removeLiquidity.secondToken secondToken!: Asset;
  @getter.removeLiquidity.firstTokenBalance firstTokenBalance!: FPNumber;
  @getter.removeLiquidity.secondTokenBalance secondTokenBalance!: FPNumber;
  @getter.removeLiquidity.shareOfPool shareOfPool!: string;
  @getter.removeLiquidity.price price!: string;
  @getter.removeLiquidity.priceReversed priceReversed!: string;

  @mutation.removeLiquidity.setAddresses private setAddresses!: (params: LiquidityParams) => void;
  @mutation.removeLiquidity.resetFocusedField resetFocusedField!: FnWithoutArgs;

  @action.removeLiquidity.setRemovePart private setRemovePart!: (removePart: string) => Promise<void>;
  @action.removeLiquidity.removeLiquidity private removeLiquidity!: AsyncFnWithoutArgs;
  @action.removeLiquidity.resetData private resetData!: AsyncFnWithoutArgs;
  @action.removeLiquidity.setFirstTokenAmount setFirstTokenAmount!: (amount: string) => Promise<void>;
  @action.removeLiquidity.setSecondTokenAmount setSecondTokenAmount!: (amount: string) => Promise<void>;

  @Watch('liquidity', { deep: true })
  private liquidityChange(): void {
    switch (this.focusedField) {
      case FocusedField.First:
      case FocusedField.Second: {
        const isFirstToken = this.focusedField === FocusedField.First;

        const balance = Number(this.getTokenMaxAmount(isFirstToken ? this.firstTokenBalance : this.secondTokenBalance));
        const amount = Number(isFirstToken ? this.firstTokenAmount : this.secondTokenAmount);

        const setValue = isFirstToken ? this.setFirstTokenAmount : this.setSecondTokenAmount;
        const value = String(Number.isFinite(balance) ? Math.min(balance, amount) : amount);

        setValue(value);
        break;
      }
      default: {
        this.setRemovePart(this.removePart);
        break;
      }
    }
  }

  async mounted(): Promise<void> {
    await this.withParentLoading(async () => {
      this.setData({
        firstAddress: this.firstRouteAddress,
        secondAddress: this.secondRouteAddress,
      });
    });
  }

  beforeDestroy(): void {
    this.resetData();
  }

  get sliderValue(): Nullable<number> {
    return this.removePart ? Number(this.removePart) : undefined;
  }

  get isEmptyAmount(): boolean {
    // We don't check removePart for less than 1%
    return !Number(this.liquidityAmount) || !this.firstTokenAmount || !this.secondTokenAmount;
  }

  get liquidityLocked(): boolean {
    return this.liquidityBalance.isZero();
  }

  get locks(): { percent: string; lock: string }[] {
    return [
      {
        balance: this.demeterLockedBalance,
        lock: 'Demeter Farming',
      },
      {
        balance: this.ceresLockedBalance,
        lock: 'Ceres Liquidity Locker',
      },
    ].reduce<{ percent: string; lock: string }[]>((buffer, { balance, lock }) => {
      if (!balance.isZero()) {
        buffer.push({
          lock,
          percent: this.getLockedPercent(balance),
        });
      }

      return buffer;
    }, []);
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
      }[this.removePart.length] ?? 'one';

    return `${charClassName}-char`;
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.RemoveLiquidity];
  }

  get formattedFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get isXorSufficientForNextOperation(): boolean {
    const params: WALLET_CONSTS.NetworkFeeWarningOptions = { type: Operation.RemoveLiquidity };

    if (this.firstToken?.address === XOR.address) {
      params.amount = this.getFPNumber(this.firstTokenAmount);
      params.isXor = true;
    }
    return this.isXorSufficientForNextTx(params);
  }

  get isMaxButtonAvailable(): boolean {
    return !this.liquidityLocked && Number(this.removePart) !== this.MAX_PART;
  }

  /** Overrides SelectedTokenRouteMixin */
  async setData(params: { firstAddress: string; secondAddress: string }): Promise<void> {
    this.setAddresses({
      firstAddress: params.firstAddress,
      secondAddress: params.secondAddress,
    });
    // If user don't have the liquidity (navigated through the address bar) redirect to the Pool page
    if (!this.liquidity) {
      return this.handleBack();
    }
  }

  handleRemovePartChange(value: string | number): void {
    if (Number(value) !== Number(this.removePart)) {
      this.setRemovePart(String(value));
    }
  }

  getTokenMaxAmount(tokenBalance: FPNumber): string {
    return tokenBalance.toString();
  }

  getLockedPercent(lockedBalance: FPNumber): string {
    const percent = lockedBalance.div(this.liquidityBalanceFull).mul(FPNumber.HUNDRED);

    return formatDecimalPlaces(percent, true);
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
    if (this.allowFeePopup && !this.isXorSufficientForNextOperation) {
      this.openWarningFeeDialog();
      await this.waitOnFeeWarningConfirmation();
      if (!this.isWarningFeeDialogConfirmed) {
        return;
      }
      this.isWarningFeeDialogConfirmed = false;
    }
    this.openConfirmDialog();
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
  justify-content: flex-start;

  &-percent {
    width: 50px;
  }
}
</style>

<style lang="scss">
.s-input.s-input--with-slider.s-input--token-value {
  @include input-slider;
}
</style>
