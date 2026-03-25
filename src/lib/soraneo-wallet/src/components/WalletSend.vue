<template>
  <wallet-base
    show-back
    :reset-focus="step.toString()"
    :title="t(`walletSend.${step === 1 ? 'title' : 'confirmTitle'}`)"
    :tooltip="tooltipContent"
    :show-header="showAdditionalInfo"
    @back="handleBack"
  >
    <div class="wallet-send">
      <template v-if="step === 1">
        <address-book-input
          v-model="address"
          class="wallet-send-address"
          exclude-connected
          :is-valid="validAddress"
          @update:name="updateName"
        ></address-book-input>

        <template v-if="validAddress && isNotSoraAddress">
          <p class="wallet-send-address-warning">{{ t('walletSend.addressWarning') }}</p>
          <s-tooltip :content="copyValueAssetId" placement="top">
            <p class="wallet-send-address-formatted" @click="handleCopyAddress(formattedSoraAddress, $event)">
              {{ formattedSoraAddress }}
            </p>
          </s-tooltip>
        </template>
        <p v-if="isAccountAddress" class="wallet-send-address-error">{{ t('walletSend.addressError') }}</p>

        <s-float-input
          v-model="amount"
          class="wallet-send-input"
          size="medium"
          has-locale-string
          :delimiters="delimiters"
          :decimals="asset.decimals"
          :max="MaxInputNumber"
          @update:model-value="fetchNetworkFeeDebounced"
        >
          <template #top>
            <div class="wallet-send-amount">
              <div class="wallet-send-amount-title">{{ t('amountText') }}</div>
              <div class="wallet-send-amount-balance">
                <span class="wallet-send-amount-balance-title">{{ t('walletSend.balance') }}</span>
                <formatted-amount-with-fiat-value
                  value-can-be-hidden
                  fiat-format-as-value
                  with-left-shift
                  value-class="wallet-send-amount-balance-value"
                  :value="formattedBalance"
                  :asset-symbol="asset.symbol"
                  :fiat-value="getFiatBalance(asset)"
                ></formatted-amount-with-fiat-value>
              </div>
            </div>
          </template>
          <template #right>
            <div class="asset s-flex">
              <s-button
                v-if="isMaxButtonAvailable"
                class="asset-max s-typography-button--small"
                type="primary"
                alternative
                size="mini"
                border-radius="mini"
                @click="handleMaxClick"
              >
                {{ t('walletSend.max') }}
              </s-button>
              <div class="asset-box">
                <div class="asset-box__logo">
                  <token-logo :token="asset" size="small"></token-logo>
                </div>
                <span class="asset-name">{{ asset.symbol }}</span>
              </div>
            </div>
          </template>
          <template #bottom>
            <div class="asset-info">
              <formatted-amount v-if="fiatAmount" :value="fiatAmount" is-fiat-value></formatted-amount>
            </div>
          </template>
        </s-float-input>
        <template v-if="!isXorAccountAsset">
          <div class="wallet-send__switch-btn">
            <s-switch v-model="withVesting" @change="fetchNetworkFee"></s-switch>
            <span>{{ t('walletSend.enableVesting') }}</span>
          </div>
          <template v-if="withVesting">
            <s-select
              v-model="selectedVestingPeriod"
              class="wallet-send__vesting-period"
              :placeholder="t('walletSend.unlockFrequency')"
            >
              <s-option
                v-for="period in vestingPeriodsInDays"
                :key="period"
                :label="formatDuration(period)"
                :value="period"
              ></s-option>
            </s-select>
            <s-float-input
              v-model="vestingPercentage"
              class="wallet-send__vesting-input"
              has-locale-string
              :placeholder="t('walletSend.vestingPercentage')"
              :decimals="2"
              :delimiters="delimiters"
              :max="100"
              @update:model-value="fetchNetworkFeeDebounced"
            >
              <template #right>
                <span>%</span>
              </template>
            </s-float-input>
            <div class="wallet-send__vesting-start-container">
              <span class="wallet-send__vesting-start-placeholder">{{ t('walletSend.startUnlockingDate') }}</span>
              <s-date-picker
                v-model="vestingStart"
                class="wallet-send__vesting-start"
                popper-class="wallet-send__vesting-start-datepicker"
                size="big"
                border-radius="small"
                value-format="timestamp"
                type="date"
                input-type="input"
                :clearable="false"
                :picker-options="{ disabledDate }"
              ></s-date-picker>
            </div>
          </template>
        </template>
        <s-button
          class="wallet-send-action s-typography-button--large"
          type="primary"
          :disabled="sendButtonDisabled"
          :loading="loading"
          @click="handleSend"
        >
          {{ sendButtonDisabledText || t('walletSend.title') }}
        </s-button>
      </template>
      <template v-else-if="step === 2">
        <network-fee-warning :fee="formattedFee" @confirm="confirmNextTxFailure"></network-fee-warning>
      </template>
      <template v-else>
        <div class="confirm">
          <div class="confirm-asset s-flex">
            <span class="confirm-asset-title">{{ formatStringValue(amount, asset.decimals) }}</span>
            <div class="confirm-asset-value s-flex">
              <div class="confirm-asset-icon">
                <token-logo :token="asset"></token-logo>
              </div>
              <span class="asset-name">{{ asset.symbol }}</span>
            </div>
          </div>

          <div class="confirm-address">
            <wallet-account class="confirm-address-card" with-identity></wallet-account>
            <s-icon name="arrows-arrow-bottom-24"></s-icon>
            <wallet-account class="confirm-address-card" :polkadot-account="recipient" with-identity></wallet-account>
          </div>

          <template v-if="withVesting">
            <info-line
              :label="t('walletSend.unlockFrequency')"
              :value="formatDuration(selectedVestingPeriod)"
            ></info-line>
            <info-line
              asset-symbol="%"
              :label="t('walletSend.vestingPercentage')"
              :value="vestingPercentage"
            ></info-line>
            <info-line :label="t('walletSend.startUnlockingDate')" :value="formattedVestingStart"></info-line>
          </template>

          <account-confirmation-option with-hint></account-confirmation-option>
        </div>

        <s-button
          class="wallet-send-action s-typography-button--large"
          type="primary"
          :disabled="sendButtonDisabled"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ sendButtonDisabledText || t('confirmText') }}
        </s-button>
      </template>

      <wallet-fee v-if="showAdditionalInfo" :value="fee"></wallet-fee>
    </div>
  </wallet-base>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import dayjs from 'dayjs';
import debounce from 'lodash/fp/debounce';
import { defineComponent } from 'vue';

import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../api';
import { RouteNames } from '../consts';
import { validateAddress, formatAddress, formatAccountAddress, delay } from '../util';

import AccountConfirmationOption from './Account/Settings/ConfirmationOption.vue';
import WalletAccount from './Account/WalletAccount.vue';
import AddressBookInput from './AddressBook/Input.vue';
import FormattedAmount from './FormattedAmount.vue';
import FormattedAmountWithFiatValue from './FormattedAmountWithFiatValue.vue';
import InfoLine from './InfoLine.vue';
import CopyAddressMixin from './mixins/CopyAddressMixin';
import FormattedAmountMixin from './mixins/FormattedAmountMixin';
import NetworkFeeWarningMixin from './mixins/NetworkFeeWarningMixin';
import TransactionMixin from './mixins/TransactionMixin';
import NetworkFeeWarning from './NetworkFeeWarning.vue';
import TokenLogo from './TokenLogo.vue';
import WalletBase from './WalletBase.vue';
import WalletFee from './WalletFee.vue';

import type { VestedTransferFeeParams, VestedTransferParams } from '@/stores/wallet/account/types';
import type { Route } from '@/stores/router/types';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset, AccountBalance, UnlockPeriodDays } from '@sora-substrate/sdk/build/assets/types';
import type { Subscription } from 'rxjs';

const MS_IN_DAY = 24 * 60 * 60_000;

export default defineComponent({
  components: {
    WalletBase,
    WalletAccount,
    FormattedAmount,
    FormattedAmountWithFiatValue,
    NetworkFeeWarning,
    WalletFee,
    TokenLogo,
    AddressBookInput,
    AccountConfirmationOption,
    InfoLine,
  },
  mixins: [TransactionMixin, FormattedAmountMixin, CopyAddressMixin, NetworkFeeWarningMixin],
  data() {
    return {
      delimiters: FPNumber.DELIMITERS_CONFIG,
      vestingPeriodsInDays: [1, 7, 30, 60, 90] as UnlockPeriodDays[],
      disabledDate: (date: Date) => {
        const currentDate = new Date().setHours(0, 0, 0, 0);
        return date.getTime() < currentDate;
      },
      step: 1,
      address: '',
      name: '',
      amount: '',
      showAdditionalInfo: true,
      withVesting: false,
      selectedVestingPeriod: 1 as UnlockPeriodDays,
      vestingPercentage: '10',
      vestingStart: Date.now(),
      fee: new FPNumber(0),
      assetBalance: null as Nullable<AccountBalance>,
      assetBalanceSubscription: null as Nullable<Subscription>,
      fetchNetworkFeeDebounced: (() => undefined) as () => void,
    };
  },
  computed: {
    routerStore(this: any) {
      return useRouterStore(this.$pinia);
    },
    walletStore(this: any) {
      return useWalletStore(this.$pinia);
    },
    previousRoute(this: any): RouteNames {
      return (this.routerStore.prev as RouteNames) ?? RouteNames.Wallet;
    },
    previousRouteParams(this: any): Record<string, unknown> {
      return this.routerStore.prevParams;
    },
    currentRouteParams(this: any): Record<string, AccountAsset | string> {
      return this.routerStore.currentParams as Record<string, AccountAsset | string>;
    },
    accountAssets(this: any): Array<AccountAsset> {
      return this.walletStore.accountAssets as Array<AccountAsset>;
    },
    isConfirmTxDisabled(this: any): boolean {
      return this.walletStore.isConfirmTxDialogDisabled;
    },
    recipient(this: any) {
      return { address: this.address, name: this.name };
    },
    assetParams(this: any): AccountAsset {
      return this.currentRouteParams.asset as AccountAsset;
    },
    accountAsset(this: any): Nullable<AccountAsset> {
      return this.accountAssets.find((accountAsset) => accountAsset.address === this.assetParams.address);
    },
    asset(this: any): AccountAsset {
      if (this.accountAsset) return this.accountAsset;

      return {
        ...this.assetParams,
        balance: this.assetBalance as AccountBalance,
      };
    },
    formattedFee(this: any): string {
      return this.fee.toLocaleString();
    },
    tooltipContent(this: any): string {
      return this.step === 1 ? this.t('walletSend.tooltip') : '';
    },
    copyValueAssetId(this: any): string {
      return this.copyTooltip(this.t('assets.assetId'));
    },
    transferableBalance(this: any): CodecString {
      return this.asset.balance ? this.asset.balance.transferable : '0';
    },
    formattedBalance(this: any): string {
      return this.formatCodecNumber(this.transferableBalance, this.asset.decimals);
    },
    assetFiatPrice(this: any): Nullable<CodecString> {
      return this.getAssetFiatPrice(this.asset);
    },
    fiatAmount(this: any): Nullable<string> {
      return this.getFiatAmountByString(this.amount, this.asset);
    },
    emptyAddress(this: any): boolean {
      return !this.address.trim();
    },
    isAccountAddress(this: any): boolean {
      return [this.address, this.formattedSoraAddress].includes(this.account.address);
    },
    formattedSoraAddress(this: any): string {
      return formatAccountAddress(this.address);
    },
    validAddress(this: any): boolean {
      return validateAddress(this.address);
    },
    isNotSoraAddress(this: any): boolean {
      return !!this.formattedSoraAddress && !this.address.startsWith('cn');
    },
    emptyAmount(this: any): boolean {
      return +this.amount === 0;
    },
    validAmount(this: any): boolean {
      const amount = this.getFPNumber(this.amount, this.asset.decimals);
      const balance = this.getFPNumberFromCodec(this.transferableBalance, this.asset.decimals);
      return amount.isFinity() && !amount.isZero() && FPNumber.lte(amount, balance);
    },
    isMaxButtonAvailable(this: any): boolean {
      if (this.shouldBalanceBeHidden) {
        return false;
      }

      const decimals = this.asset.decimals;
      const balance = this.getFPNumberFromCodec(this.transferableBalance, decimals);
      const amount = this.getFPNumber(this.amount, decimals);

      if (this.isXorAccountAsset) {
        if (this.fee.isZero()) {
          return false;
        }
        return !FPNumber.eq(this.fee, balance.sub(amount)) && FPNumber.gt(balance, this.fee);
      }
      return !FPNumber.eq(balance, amount);
    },
    hasEnoughXor(this: any): boolean {
      return api.hasEnoughXor(this.asset, this.amount, this.fee);
    },
    sendButtonDisabled(this: any): boolean {
      return (
        this.loading ||
        !this.validAddress ||
        !this.validAmount ||
        !this.hasEnoughXor ||
        (this.withVesting && !+this.vestingPercentage)
      );
    },
    sendButtonDisabledText(this: any): string {
      if (!this.validAddress) {
        return this.t(`walletSend.${this.emptyAddress ? 'enterAddress' : 'badAddress'}`);
      }

      if (!this.validAmount) {
        return this.emptyAmount
          ? this.t('walletSend.enterAmount')
          : this.t('insufficientBalanceText', { tokenSymbol: this.asset.symbol });
      }

      if (!this.hasEnoughXor) {
        return this.t('insufficientBalanceText', { tokenSymbol: XOR.symbol });
      }

      const vestingPercentage = +this.vestingPercentage;
      if (this.withVesting && (!vestingPercentage || vestingPercentage > 100)) {
        return this.t('walletSend.enterVestingPercentage');
      }

      return '';
    },
    isXorAccountAsset(this: any): boolean {
      return this.asset.address === XOR.address;
    },
    formattedVestingStart(this: any): string {
      return this.formatDate(this.vestingStart, 'll');
    },
  },
  created(this: any): void {
    this.fetchNetworkFeeDebounced = debounce(100)(() => this.fetchNetworkFee());

    if (!this.currentRouteParams.asset) {
      this.handleBack();
      return;
    }

    if (this.currentRouteParams.address) {
      this.address = this.currentRouteParams.address as string;
    }

    if (this.currentRouteParams.amount) {
      this.amount = this.currentRouteParams.amount as string;
    }

    if (!this.accountAsset) {
      this.resetAssetBalanceSubscription();
      this.assetBalanceSubscription = api.assets.getAssetBalanceObservable(this.assetParams).subscribe((balance) => {
        this.assetBalance = balance;
      });
    }

    this.fee = this.getFPNumberFromCodec(this.networkFees.Transfer);
  },
  beforeUnmount(this: any): void {
    this.resetAssetBalanceSubscription();
  },
  methods: {
    transfer(this: any, payload: { to: string; amount: string }) {
      return this.walletStore.transfer(payload);
    },
    vestedTransfer(this: any, payload: VestedTransferParams) {
      return this.walletStore.vestedTransfer(payload);
    },
    getVestedTransferFee(this: any, payload: VestedTransferFeeParams) {
      return this.walletStore.getVestedTransferFee(payload);
    },
    navigate(this: any, options: Route): void {
      this.routerStore.navigate(options);
    },
    updateName(this: any, name: string): void {
      this.name = name;
    },
    formatDuration(this: any, days: UnlockPeriodDays): string {
      return dayjs
        .duration(days * MS_IN_DAY)
        .locale(this.dayjsLocale)
        .humanize();
    },
    async fetchNetworkFee(this: any): Promise<void> {
      const percent = +this.vestingPercentage;

      if (this.withVesting && percent > 0 && percent <= 100 && !this.emptyAmount) {
        this.loading = true;
        await delay(250);
        const fee = await this.getVestedTransferFee({
          amount: this.amount,
          asset: this.asset,
          unlockPeriodInDays: this.selectedVestingPeriod,
          vestingPercent: percent,
        } as VestedTransferFeeParams);

        if (fee) {
          this.fee = fee;
        }
        this.loading = false;
      } else {
        this.fee = this.getFPNumberFromCodec(this.networkFees.Transfer);
      }
    },
    getFormattedAddress(this: any, asset: AccountAsset): string {
      return formatAddress(asset.address, 10);
    },
    handleBack(this: any): void {
      if (this.step !== 1) {
        this.showAdditionalInfo = true;
        this.step = 1;
        return;
      }
      this.navigate({
        name: this.previousRoute,
        params: this.previousRouteParams,
      });
    },
    async handleMaxClick(this: any): Promise<void> {
      if (this.isXorAccountAsset) {
        const balance = this.getFPNumberFromCodec(this.transferableBalance, this.asset.decimals);
        this.amount = balance.sub(this.fee).toString();
        return;
      }
      this.amount = this.getStringFromCodec(this.transferableBalance, this.asset.decimals);
    },
    async handleSend(this: any): Promise<void> {
      if (
        this.allowFeePopup &&
        !this.isXorSufficientForNextTx({
          type: Operation.Transfer,
          isXor: this.isXorAccountAsset,
          amount: this.getFPNumber(this.amount),
        })
      ) {
        this.showAdditionalInfo = false;
        this.step = 2;
        return;
      }

      if (this.isConfirmTxDisabled) {
        await this.handleConfirm();
      } else {
        await this.fetchNetworkFee();
        this.step = 3;
      }
    },
    async handleConfirm(this: any): Promise<void> {
      await this.withNotifications(async () => {
        if (!this.hasEnoughXor) throw new Error('walletSend.insufficientBalanceText');

        const percent = +this.vestingPercentage;
        if (this.withVesting && percent > 0 && percent <= 100) {
          const currentDate = new Date();
          const hours = currentDate.getHours();
          const minutes = currentDate.getMinutes();
          const seconds = currentDate.getSeconds();
          const milliseconds = currentDate.getMilliseconds();
          const start = new Date(this.vestingStart).setHours(hours, minutes, seconds, milliseconds);
          await this.vestedTransfer({
            amount: this.amount,
            asset: this.asset,
            to: this.address,
            unlockPeriodInDays: this.selectedVestingPeriod,
            vestingPercent: percent,
            start,
            current: currentDate.getTime(),
          } as VestedTransferParams);
        } else {
          await this.transfer({ to: this.address, amount: this.amount });
        }
        this.navigate({ name: RouteNames.Wallet });
      });
    },
    confirmNextTxFailure(this: any): void {
      this.showAdditionalInfo = true;
      this.step = 3;
    },
    resetAssetBalanceSubscription(this: any): void {
      if (this.assetBalanceSubscription) {
        this.assetBalanceSubscription.unsubscribe();
      }
    },
  },
});
</script>

<style lang="scss">
.wallet-send {
  &-amount-balance {
    .formatted-amount--fiat-value {
      text-align: right;
    }
  }
  &-input .el-input__inner {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    font-size: var(--s-font-size-large);
    line-height: var(--s-line-height-small);
    font-weight: 800;
  }
  &__vesting {
    &-period.s-select > .s-placeholder {
      color: var(--s-color-base-content-secondary);
      letter-spacing: var(--s-letter-spacing-small);
      font-weight: 300;
    }
    &-start {
      &.s-date-picker.neumorphic.s-input-type .el-date-editor {
        > .el-input__inner {
          padding-top: 16px;
          box-shadow: var(--s-shadow-element);
        }
        &:hover,
        & {
          .el-input__inner {
            background-color: var(--s-color-base-background);
            border-color: var(--s-color-base-background);
          }
        }
      }
      &-datepicker.el-picker-panel {
        border-radius: var(--s-border-radius-small);
        .popper__arrow {
          display: none;
        }
        td.disabled .cell {
          &,
          &:hover {
            color: var(--s-color-base-content-secondary);
            background-color: var(--s-color-base-background);
          }
        }
        .el-year-table,
        .el-year-table td .cell {
          td .cell {
            border-radius: var(--s-border-radius-small);
          }
        }
      }
    }
  }
}
</style>

<style scoped lang="scss">
$logo-size: var(--s-size-mini);
$telegram-web-app-width: 500px;
// TODO: fix typography issues here

.wallet-send {
  .asset {
    align-items: center;

    & > * {
      margin-left: var(--s-basic-spacing);
    }

    &-balance {
      margin-left: auto;
      &-title {
        color: var(--s-color-base-content-tertiary);
        font-size: var(--s-font-size-mini);
      }
      &-value {
        margin-left: $basic-spacing-mini;
        letter-spacing: var(--s-letter-spacing-big);
      }
    }
    &-box {
      display: flex;
      align-items: center;
      background-color: var(--s-color-utility-surface);
      border-radius: var(--s-border-radius-mini);
      box-shadow: var(--s-shadow-element);
      padding: $basic-spacing-mini #{$basic-spacing-tiny};
      &__logo {
        @include asset-logo-styles;
        margin-right: var(--s-basic-spacing) !important;
      }
    }
    &-max {
      height: var(--s-size-mini);
      padding: $basic-spacing-mini var(--s-basic-spacing);
    }
    &-max,
    &-name {
      font-weight: 800;
    }
    &-name {
      font-size: var(--s-icon-font-size-small);
      line-height: var(--s-line-height-reset);
    }
    &-info {
      display: flex;
      align-items: baseline;
      .formatted-amount--fiat-value {
        margin-right: $basic-spacing-mini;
        font-weight: 600;
      }
    }
    &-highlight {
      margin-left: auto;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-extra-mini);
      font-weight: 300;
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
      text-align: right;
    }
  }

  &__new-address {
    background: rgba(248, 8, 123, 0.09);
    height: 50px;
    width: 100%;
    border-radius: 16px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--s-color-base-content-primary);
    padding: 0 10px;

    &-msg {
      font-weight: 330;
    }

    &-save {
      color: var(--s-color-theme-accent);
      &:hover {
        cursor: pointer;
      }
    }
  }
  .nft-image {
    position: absolute;
    z-index: 1;
  }
  .asset-id,
  &-address-formatted {
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
  &-address-formatted,
  .confirm-from,
  .confirm-to {
    word-break: break-all;
  }
  &-address {
    margin-bottom: var(--s-basic-spacing);
    &-description {
      margin-bottom: #{$basic-spacing-medium};
    }
    &-warning,
    &-error,
    &-formatted {
      padding-right: calc(var(--s-basic-spacing) * 1.25);
      padding-left: calc(var(--s-basic-spacing) * 1.25);
    }
    &-warning,
    &-error {
      margin-bottom: var(--s-basic-spacing);
      font-weight: 400;
      font-size: var(--s-font-size-extra-small);
      line-height: var(--s-line-height-base);
    }
    &-warning {
      color: var(--s-color-status-warning);
    }
    &-error {
      color: var(--s-color-status-error);
    }
    &-formatted {
      margin-bottom: calc(var(--s-basic-spacing) * 2);
      font-weight: 200;
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-base);
      letter-spacing: var(--s-letter-spacing-small);
    }
  }
  &-amount {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: var(--s-basic-spacing);
    font-size: var(--s-font-size-mini);
    font-weight: 300;
    line-height: var(--s-line-height-medium);
    text-transform: uppercase;

    &-title,
    &-balance {
      display: inline-flex;
      align-items: baseline;

      &-title {
        margin-right: $basic-spacing-mini;
      }
    }
    &-balance {
      flex-wrap: wrap;
      justify-content: flex-end;
      margin-left: var(--s-basic-spacing);
      &-title {
        color: var(--s-color-base-content-secondary);
      }
    }
  }
  &__switch-btn {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin: var(--s-basic-spacing) 0;
    > :first-child {
      margin-right: var(--s-basic-spacing);
    }
  }
  &__vesting {
    &-input {
      margin-top: var(--s-basic-spacing);
    }
    &-start {
      &-container {
        position: relative;
        margin-top: var(--s-basic-spacing);
      }
      &-placeholder {
        position: absolute;
        z-index: 1;
        padding: 8px 16px;
        font-size: var(--s-font-size-mini);
        color: var(--s-color-base-content-secondary);
        letter-spacing: var(--s-letter-spacing-small);
        font-weight: 300;
      }
    }
  }
  &-action {
    margin-top: #{$basic-spacing-medium};
    width: 100%;
  }
  .confirm {
    display: flex;
    flex-flow: column nowrap;
    gap: $basic-spacing-medium;

    &-asset {
      font-size: var(--s-heading2-font-size);
      line-height: var(--s-line-height-small);
      font-weight: 800;
      &-title {
        line-height: 1.33;
        flex: 1;
        word-break: break-word;
      }
      &-value {
        align-items: center;
        justify-content: flex-end;
        white-space: nowrap;
        .asset {
          &-name {
            font-size: var(--s-heading2-font-size);
            line-height: var(--s-line-height-small);
          }
        }
      }
      &-icon {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        white-space: nowrap;
        position: relative;
        margin-right: calc(var(--s-basic-spacing) * 2);
      }
    }

    &-address {
      display: flex;
      flex-flow: column nowrap;
      align-items: center;
      gap: var(--s-basic-spacing);

      font-size: var(--s-font-size-mini);
      font-weight: 600;
      overflow-wrap: break-word;

      &-card {
        width: 100%;
      }

      span {
        @media screen and (max-width: $telegram-web-app-width) {
          font-size: 9.65px;
        }
      }
    }
  }
}
</style>
