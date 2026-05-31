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
              :label="t('walletSend.unlockFrequency')"
              :options="vestingPeriodOptions"
            ></s-select>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  getWalletCurrentParams,
  getWalletPreviousParams,
  getWalletPreviousRoute,
  type WalletNavigationTarget,
} from '@/platform/wallet/navigation';
import { useCopyAddress } from '../composables/useCopyAddress';
import { useFormattedAmount } from '../composables/useFormattedAmount';
import { useNetworkFeeWarning } from '../composables/useNetworkFeeWarning';
import { useTransaction } from '../composables/useTransaction';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../api';
import { RouteNames } from '../consts';
import { validateAddress, formatAccountAddress, delay } from '../util';
import { getWalletSendMaxAmount, isWalletSendMaxAvailable } from '../util/walletSendMax';

import AccountConfirmationOption from './Account/Settings/ConfirmationOption.vue';
import WalletAccount from './Account/WalletAccount.vue';
import AddressBookInput from './AddressBook/Input.vue';
import FormattedAmount from './FormattedAmount.vue';
import FormattedAmountWithFiatValue from './FormattedAmountWithFiatValue.vue';
import InfoLine from './InfoLine.vue';
import NetworkFeeWarning from './NetworkFeeWarning.vue';
import TokenLogo from './TokenLogo.vue';
import WalletBase from './WalletBase.vue';
import WalletFee from './WalletFee.vue';

import type { VestedTransferFeeParams, VestedTransferParams } from '@/stores/wallet/account/types';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset, AccountBalance, UnlockPeriodDays } from '@sora-substrate/sdk/build/assets/types';
import type { Subscription } from 'rxjs';

const MS_IN_DAY = 24 * 60 * 60_000;

export default {
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
  setup() {
    const walletStore = useWalletStore();
    const {
      t,
      account,
      loading,
      dayjsLocale,
      formatDate,
      getFPNumber,
      getFPNumberFromCodec,
      formatCodecNumber,
      formatStringValue,
      MaxInputNumber,
      shouldBalanceBeHidden,
      withNotifications,
    } = useTransaction();
    const { getFiatBalance, getFiatAmountByString } = useFormattedAmount();
    const { handleCopyAddress, copyTooltip } = useCopyAddress();
    const { allowFeePopup, networkFees, isXorSufficientForNextTx } = useNetworkFeeWarning();

    const delimiters = FPNumber.DELIMITERS_CONFIG;
    const vestingPeriodsInDays = [1, 7, 30, 60, 90] as UnlockPeriodDays[];
    const disabledDate = (date: Date) => {
      const currentDate = new Date().setHours(0, 0, 0, 0);
      return date.getTime() < currentDate;
    };
    const emptyAsset = { address: '', symbol: '', name: '', decimals: 0, balance: null } as AccountAsset;

    const step = ref(1);
    const address = ref('');
    const name = ref('');
    const amount = ref('');
    const showAdditionalInfo = ref(true);
    const withVesting = ref(false);
    const selectedVestingPeriod = ref<UnlockPeriodDays>(1);
    const vestingPercentage = ref('10');
    const vestingStart = ref(Date.now());
    const fee = ref(new FPNumber(0));
    const assetBalance = ref<Nullable<AccountBalance>>(null);
    const assetBalanceSubscription = ref<Nullable<Subscription>>(null);

    const previousRoute = computed<RouteNames>(() => (getWalletPreviousRoute() as RouteNames) ?? RouteNames.Wallet);
    const previousRouteParams = computed<Record<string, unknown>>(() =>
      getWalletPreviousParams<Record<string, unknown>>()
    );
    const currentRouteParams = computed<Record<string, AccountAsset | string>>(() =>
      getWalletCurrentParams<Record<string, AccountAsset | string>>()
    );
    const accountAssets = computed<Array<AccountAsset>>(() => walletStore.accountAssets as Array<AccountAsset>);
    const isConfirmTxDisabled = computed<boolean>(() => walletStore.isConfirmTxDialogDisabled);
    const recipient = computed(() => ({ address: address.value, name: name.value }));
    const assetParams = computed<Nullable<AccountAsset>>(
      () => currentRouteParams.value.asset as Nullable<AccountAsset>
    );
    const accountAsset = computed<Nullable<AccountAsset>>(() => {
      if (!assetParams.value) return null;

      return accountAssets.value.find((entry) => entry.address === assetParams.value?.address) ?? null;
    });
    const asset = computed<AccountAsset>(() => {
      if (accountAsset.value) return accountAsset.value;
      if (assetParams.value) {
        return {
          ...assetParams.value,
          balance: assetBalance.value as AccountBalance,
        };
      }

      return emptyAsset;
    });
    const formattedFee = computed(() => fee.value.toLocaleString());
    const tooltipContent = computed(() => (step.value === 1 ? t('walletSend.tooltip') : ''));
    const copyValueAssetId = computed(() => copyTooltip(t('assets.assetId')));
    const transferableBalance = computed<CodecString>(() =>
      asset.value.balance ? asset.value.balance.transferable : '0'
    );
    const formattedBalance = computed(() => formatCodecNumber(transferableBalance.value, asset.value.decimals));
    const fiatAmount = computed(() => getFiatAmountByString(amount.value, asset.value));
    const emptyAddress = computed(() => !address.value.trim());
    const isAccountAddress = computed(() =>
      [address.value, formattedSoraAddress.value].includes(account.value?.address)
    );
    const formattedSoraAddress = computed(() => formatAccountAddress(address.value));
    const validAddress = computed(() => validateAddress(address.value));
    const isNotSoraAddress = computed(() => !!formattedSoraAddress.value && !address.value.startsWith('cn'));
    const emptyAmount = computed(() => +amount.value === 0);
    const validAmount = computed(() => {
      const fpAmount = getFPNumber(amount.value, asset.value.decimals);
      const balance = getFPNumberFromCodec(transferableBalance.value, asset.value.decimals);

      return fpAmount.isFinity() && !fpAmount.isZero() && FPNumber.lte(fpAmount, balance);
    });
    const isXorAccountAsset = computed(() => asset.value.address === XOR.address);
    const maxAmount = computed(() =>
      getWalletSendMaxAmount({
        assetAddress: asset.value.address,
        balance: transferableBalance.value,
        decimals: asset.value.decimals,
        fee: fee.value,
      })
    );
    const isMaxButtonAvailable = computed(() =>
      isWalletSendMaxAvailable({
        maxAmount: maxAmount.value,
        shouldBalanceBeHidden: shouldBalanceBeHidden.value,
      })
    );
    const hasEnoughXor = computed(() => api.hasEnoughXor(asset.value, amount.value, fee.value));
    const sendButtonDisabled = computed(
      () =>
        loading.value ||
        !validAddress.value ||
        !validAmount.value ||
        !hasEnoughXor.value ||
        (withVesting.value && !+vestingPercentage.value)
    );
    const sendButtonDisabledText = computed(() => {
      if (!validAddress.value) {
        return t(`walletSend.${emptyAddress.value ? 'enterAddress' : 'badAddress'}`);
      }

      if (!validAmount.value) {
        return emptyAmount.value
          ? t('walletSend.enterAmount')
          : t('insufficientBalanceText', { tokenSymbol: asset.value.symbol });
      }

      if (!hasEnoughXor.value) {
        return t('insufficientBalanceText', { tokenSymbol: XOR.symbol });
      }

      const percent = +vestingPercentage.value;
      if (withVesting.value && (!percent || percent > 100)) {
        return t('walletSend.enterVestingPercentage');
      }

      return '';
    });
    const formattedVestingStart = computed(() => formatDate(vestingStart.value, 'll'));

    const transfer = (payload: { to: string; amount: string }) => walletStore.transfer(payload);
    const vestedTransfer = (payload: VestedTransferParams) => walletStore.vestedTransfer(payload);
    const getVestedTransferFee = (payload: VestedTransferFeeParams) => walletStore.getVestedTransferFee(payload);

    const navigate = (options: WalletNavigationTarget): void => {
      walletStore.navigate(options);
    };

    const updateName = (value: string): void => {
      name.value = value;
    };

    const formatDuration = (days: UnlockPeriodDays): string => {
      return dayjs
        .duration(days * MS_IN_DAY)
        .locale(dayjsLocale.value)
        .humanize();
    };
    const vestingPeriodOptions = computed(() =>
      vestingPeriodsInDays.map((period) => ({
        label: formatDuration(period),
        value: period,
      }))
    );

    const resetAssetBalanceSubscription = (): void => {
      assetBalanceSubscription.value?.unsubscribe();
      assetBalanceSubscription.value = null;
    };

    const fetchNetworkFee = async (): Promise<void> => {
      const percent = +vestingPercentage.value;

      if (withVesting.value && percent > 0 && percent <= 100 && !emptyAmount.value) {
        loading.value = true;
        await delay(250);
        const nextFee = await getVestedTransferFee({
          amount: amount.value,
          asset: asset.value,
          unlockPeriodInDays: selectedVestingPeriod.value,
          vestingPercent: percent,
        } as VestedTransferFeeParams);

        if (nextFee) {
          fee.value = nextFee;
        }

        loading.value = false;
        return;
      }

      fee.value = getFPNumberFromCodec(networkFees.value.Transfer);
    };

    const fetchNetworkFeeDebounced = debounce(100)(() => void fetchNetworkFee()) as () => void;

    const handleBack = (): void => {
      if (step.value !== 1) {
        showAdditionalInfo.value = true;
        step.value = 1;
        return;
      }

      navigate({
        name: previousRoute.value,
        params: previousRouteParams.value,
      });
    };

    const handleMaxClick = async (): Promise<void> => {
      amount.value = maxAmount.value.toString();
    };

    const handleSend = async (): Promise<void> => {
      if (
        allowFeePopup.value &&
        !isXorSufficientForNextTx({
          type: Operation.Transfer,
          isXor: isXorAccountAsset.value,
          amount: getFPNumber(amount.value),
        })
      ) {
        showAdditionalInfo.value = false;
        step.value = 2;
        return;
      }

      if (isConfirmTxDisabled.value) {
        await handleConfirm();
      } else {
        await fetchNetworkFee();
        step.value = 3;
      }
    };

    const handleConfirm = async (): Promise<void> => {
      await withNotifications(async () => {
        if (!hasEnoughXor.value) {
          throw new Error('walletSend.insufficientBalanceText');
        }

        const percent = +vestingPercentage.value;
        if (withVesting.value && percent > 0 && percent <= 100) {
          const currentDate = new Date();
          const hours = currentDate.getHours();
          const minutes = currentDate.getMinutes();
          const seconds = currentDate.getSeconds();
          const milliseconds = currentDate.getMilliseconds();
          const start = new Date(vestingStart.value).setHours(hours, minutes, seconds, milliseconds);

          await vestedTransfer({
            amount: amount.value,
            asset: asset.value,
            to: address.value,
            unlockPeriodInDays: selectedVestingPeriod.value,
            vestingPercent: percent,
            start,
            current: currentDate.getTime(),
          } as VestedTransferParams);
        } else {
          await transfer({ to: address.value, amount: amount.value });
        }

        navigate({ name: RouteNames.Wallet });
      });
    };

    const confirmNextTxFailure = (): void => {
      showAdditionalInfo.value = true;
      step.value = 3;
    };

    onMounted(() => {
      if (!assetParams.value) {
        handleBack();
        return;
      }

      if (currentRouteParams.value.address) {
        address.value = currentRouteParams.value.address as string;
      }

      if (currentRouteParams.value.amount) {
        amount.value = currentRouteParams.value.amount as string;
      }

      if (!accountAsset.value) {
        resetAssetBalanceSubscription();
        assetBalanceSubscription.value = api.assets
          .getAssetBalanceObservable(assetParams.value)
          .subscribe((balance) => {
            assetBalance.value = balance;
          });
      }

      fee.value = getFPNumberFromCodec(networkFees.value.Transfer);
    });

    onBeforeUnmount(() => {
      resetAssetBalanceSubscription();
    });

    return {
      t,
      loading,
      delimiters,
      vestingPeriodsInDays,
      disabledDate,
      step,
      address,
      amount,
      showAdditionalInfo,
      withVesting,
      selectedVestingPeriod,
      vestingPeriodOptions,
      vestingPercentage,
      vestingStart,
      fee,
      asset,
      recipient,
      formattedFee,
      tooltipContent,
      copyValueAssetId,
      formattedBalance,
      fiatAmount,
      validAddress,
      isAccountAddress,
      formattedSoraAddress,
      isNotSoraAddress,
      sendButtonDisabled,
      sendButtonDisabledText,
      isXorAccountAsset,
      isMaxButtonAvailable,
      hasEnoughXor,
      formattedVestingStart,
      fetchNetworkFee,
      fetchNetworkFeeDebounced,
      handleBack,
      handleCopyAddress,
      handleMaxClick,
      handleSend,
      handleConfirm,
      confirmNextTxFailure,
      updateName,
      formatDuration,
      formatStringValue,
      getFiatBalance,
      MaxInputNumber,
    };
  },
};
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
