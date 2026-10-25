<template>
  <div class="transaction-container">
    <div class="transaction">
      <transaction-hash-view v-if="transactionFromHash.value" v-bind="transactionFromHash"></transaction-hash-view>
      <div class="info-line-container">
        <info-line :label="t('transaction.status')">
          <span :class="statusClass">{{ statusTitle }}</span>
          <s-icon v-if="isCompleteTransaction" name="basic-check-mark-24" size="16px"></s-icon>
        </info-line>
        <info-line v-if="errorMessage" :label="t('errorText')">
          <span :class="statusClass">{{ errorMessage }}</span>
        </info-line>
        <info-line
          v-if="transactionFromDate"
          :label="t('transaction.startTime')"
          :value="transactionFromDate"
        ></info-line>
        <info-line
          v-if="selectedTransaction.amount"
          is-formatted
          value-can-be-hidden
          :label="t('transaction.amount')"
          :value="transactionAmount"
          :fiat-value="transactionAmountUSD"
          :asset-symbol="transactionSymbol"
        >
          <token-logo :token-symbol="transactionSymbol" size="small"></token-logo>
        </info-line>
        <info-line
          v-if="vestingPercentage"
          is-formatted
          value-can-be-hidden
          asset-symbol="%"
          :label="t('walletSend.vestingPercentage')"
          :value="vestingPercentage"
        ></info-line>
        <info-line
          v-if="vestingPeriod"
          value-can-be-hidden
          :label="t('walletSend.unlockFrequency')"
          :value="vestingPeriod"
        ></info-line>
        <info-line
          v-if="vestingStartDate"
          value-can-be-hidden
          :label="t('walletSend.startUnlockingDate')"
          :value="vestingStartDate"
        ></info-line>
        <info-line
          v-if="'price' in selectedTransaction && selectedTransaction.price"
          is-formatted
          value-can-be-hidden
          :label="t('transaction.price')"
          :value="selectedTransaction.price"
          :asset-symbol="transactionSymbol2"
        ></info-line>
        <info-line
          v-if="'side' in selectedTransaction && selectedTransaction.side"
          :label="t('transaction.side')"
          :value="selectedTransaction.side.toUpperCase()"
        ></info-line>
        <info-line
          v-if="selectedTransaction.amount2"
          is-formatted
          value-can-be-hidden
          :label="t('transaction.amount2')"
          :value="transactionAmount2"
          :fiat-value="transactionAmount2USD"
          :asset-symbol="transactionSymbol2"
        >
          <token-logo :token-symbol="transactionSymbol2" size="small"></token-logo>
        </info-line>
        <info-line
          v-if="amountOfDaysBeforeExpirationTrx !== '0'"
          value-can-be-hidden
          label="time left"
          :value="amountOfDaysBeforeExpirationTrx"
        ></info-line>
        <info-line
          v-if="isMST && isTransactionNotSigned && isNotTheAccountInitiatedTrx"
          class="xor-min-amount"
          :label="t('mst.minFee') + ` (${getMainAccountName()})`"
        >
          <span>
            {{ minAmountOfXorForSign !== 0 ? minAmountOfXorForSign : t('mst.loading') }}
            <span>
              {{ xor }}
            </span>
          </span>
        </info-line>
        <info-line v-if="transactionFee" :label="t('transaction.fee')">
          {{ transactionFee }}
          <token-logo :token-symbol="networkFeeSymbol" size="small"></token-logo>
        </info-line>
        <info-line v-if="transactionComment" :label="t('transaction.comment')">
          {{ transactionComment }}
        </info-line>
      </div>
      <transaction-hash-view
        v-if="transactionFromAddress"
        :translation="isSetReferralOperation ? 'transaction.referral' : 'transaction.from'"
        :value="transactionFromAddress"
        :type="HashType.Account"
      ></transaction-hash-view>
      <transaction-hash-view
        v-if="transactionToAddress && (!isSetReferralOperation || !isReferrer)"
        :translation="isSetReferralOperation ? 'transaction.referrer' : 'transaction.to'"
        :value="transactionToAddress"
        :type="HashType.Account"
      ></transaction-hash-view>
    </div>

    <s-button
      v-if="isMST && isTransactionNotSigned && isNotTheAccountInitiatedTrx"
      class="sign-btn disabled"
      type="primary"
      :disabled="minAmountOfXorForSign === 0 || currentAmountOfXorSignerHas <= minAmountOfXorForSign"
      @click="onSignButtonClick"
    >
      {{ t('mst.sign') }}
    </s-button>
    <div v-if="isMST && amountOfThreshold != 0" class="amount-of-signatures">
      <div class="already-signed">
        <p>{{ t('mst.amountOfSignatures').toUpperCase() }}</p>
        <p>
          <span>{{ alreadySigned }}</span> / {{ amountOfThreshold }}
        </p>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: progressPercentageMstSigned + '%' }"></div>
      </div>
    </div>

    <adar-tx-details v-if="isAdarOperation" :transaction="selectedTransaction"></adar-tx-details>
  </div>
</template>

<script lang="ts">
import { TransactionStatus, Operation, FPNumber } from '@sora-substrate/sdk';
import { KnownSymbols, XOR } from '@sora-substrate/sdk/build/assets/consts';
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { useEthBridgeTransaction } from '../composables/useEthBridgeTransaction';
import { useNotification } from '../composables/useNotification';
import { useNumberFormatter } from '../composables/useNumberFormatter';
import { useWalletStore } from '@/stores/wallet';

import { api } from '../api';
import { HashType } from '../consts';

import InfoLine from './InfoLine.vue';
import TokenLogo from './TokenLogo.vue';
import TransactionHashView from './TransactionHashView.vue';
import AdarTxDetails from './WalletAdarTxDetails.vue';

import type { PolkadotJsAccount, AssetsTable } from '../types/common';
import type { HistoryItem } from '@sora-substrate/sdk';

export default {
  components: {
    InfoLine,
    TokenLogo,
    TransactionHashView,
    AdarTxDetails,
  },
  emits: ['backToWallet'],
  setup(_props, { emit }) {
    const walletStore = useWalletStore();
    const { t, formatDate, showAppNotification, dayjsLocale } = useNotification();
    const { getFPNumber, getFPNumberFromCodec, formatCodecNumber, formatStringValue } = useNumberFormatter();
    const { isEthBridgeTxToCompleted, isEthBridgeTxFromFailed, isEthBridgeTxToFailed } = useEthBridgeTransaction();

    const minAmountOfXorForSign = ref(0);
    const currentAmountOfXorSignerHas = ref(0);

    const blockNumber = computed(() => walletStore.blockNumber);
    const assetsDataTable = computed(() => walletStore.assetsDataTable);
    const account = computed(() => walletStore.account);
    const selectedTransaction = computed(() => walletStore.selectedTransaction);
    const isCompleteTransaction = computed(() =>
      [TransactionStatus.InBlock, TransactionStatus.Finalized].includes(
        selectedTransaction.value.status as TransactionStatus
      )
    );
    const isFailedTransaction = computed(() =>
      [TransactionStatus.Error, TransactionStatus.Invalid].includes(
        selectedTransaction.value.status as TransactionStatus
      )
    );
    const statusClass = computed(() => getStatusClassValue(isFailedTransaction.value));
    const statusTitle = computed(() => {
      if (isFailedTransaction.value) return t('transaction.statuses.failed');
      if (isCompleteTransaction.value) return t('transaction.statuses.complete');
      return t('transaction.statuses.pending');
    });
    const transactionAmount = computed(() => formatStringValue(selectedTransaction.value.amount as string));
    const transactionAmountUSD = computed(() => {
      const amountUSD = selectedTransaction.value.payload?.amountUSD;
      return amountUSD ? formatStringValue(amountUSD) : '';
    });
    const transactionAmount2 = computed(() => formatStringValue(selectedTransaction.value.amount2 as string));
    const transactionAmount2USD = computed(() => {
      const amountUSD = selectedTransaction.value.payload?.amount2USD;
      return amountUSD ? formatStringValue(amountUSD) : '';
    });
    const transactionSymbol = computed(() => {
      const { type, symbol, symbol2 } = selectedTransaction.value;

      if ([Operation.DemeterFarmingDepositLiquidity, Operation.DemeterFarmingWithdrawLiquidity].includes(type)) {
        return `${symbol}-${symbol2}`;
      }

      if (Operation.OrderBookPlaceLimitOrder) {
        const { assetAddress } = selectedTransaction.value;
        const asset = assetAddress ? (assetsDataTable.value as AssetsTable)[assetAddress] : null;

        if (asset) {
          return asset.symbol;
        }
      }

      return symbol || '';
    });
    const transactionSymbol2 = computed(() => {
      if (Operation.OrderBookPlaceLimitOrder) {
        const { asset2Address } = selectedTransaction.value;
        const asset = asset2Address ? (assetsDataTable.value as AssetsTable)[asset2Address] : null;

        if (asset) {
          return asset.symbol;
        }
      }

      return selectedTransaction.value.symbol2 || '';
    });
    const isRecipient = computed(() => (account.value as PolkadotJsAccount).address !== selectedTransaction.value.from);
    const transactionFee = computed(() => (isRecipient.value ? null : getNetworkFee()));
    const transactionFromDate = computed(() =>
      selectedTransaction.value.startTime ? formatDate(selectedTransaction.value.startTime as number) : null
    );
    const transactionFromAddress = computed(() => selectedTransaction.value.from);
    const transactionToAddress = computed(() => selectedTransaction.value.to);
    const transactionFromHash = computed(() => getTransactionHashData());
    const transactionComment = computed(() => (selectedTransaction.value as any).comment || null);
    const isSetReferralOperation = computed(() => selectedTransaction.value.type === Operation.ReferralSetInvitedUser);
    const vestingPercentage = computed<Nullable<string>>(() =>
      'percent' in selectedTransaction.value ? `${selectedTransaction.value.percent}` : null
    );
    const vestingPeriod = computed<Nullable<string>>(() => {
      if (!('period' in selectedTransaction.value)) return null;
      const periodInMs = selectedTransaction.value.period * 6_000;
      return dayjs.duration(periodInMs).locale(dayjsLocale.value).humanize();
    });
    const vestingStartDate = computed<Nullable<string>>(() => {
      if (!('start' in selectedTransaction.value)) return null;
      const diffBlock = selectedTransaction.value.start - blockNumber.value;
      const diffMs = diffBlock * 6_000;
      return formatDate(Date.now() + diffMs, 'll LT');
    });
    const isReferrer = computed(
      () =>
        isSetReferralOperation.value && (account.value as PolkadotJsAccount).address === selectedTransaction.value.to
    );
    const errorMessage = computed<Nullable<string>>(() => {
      const error = selectedTransaction.value.errorMessage;
      if (!error) {
        return null;
      }

      let errMessage = t('historyErrorMessages.generalError');

      if (typeof error === 'string') {
        return errMessage;
      }

      if (error.name && error.section) {
        errMessage = t(`historyErrorMessages.${error.section.toLowerCase()}.${error.name.toLowerCase()}`);
        if (errMessage.startsWith('historyErrorMessages')) {
          return t('historyErrorMessages.generalError');
        }
      }

      return errMessage;
    });
    const isAdarOperation = computed(() => selectedTransaction.value.type === Operation.SwapTransferBatch);
    const networkFeeSymbol = KnownSymbols.XOR;
    const isMST = computed(() => api.mst.isMST());
    const xor = XOR.symbol;
    const isTransactionNotSigned = computed(() => selectedTransaction.value.status === TransactionStatus.Pending);
    const isNotTheAccountInitiatedTrx = computed(() => {
      const addressOfMainAccount = api.formatAddress(api?.mst?.getPrevoiusAccount());
      if ('multisig' in selectedTransaction.value && selectedTransaction.value.multisig) {
        return addressOfMainAccount !== selectedTransaction.value.multisig.signatories[0];
      }
      return false;
    });
    const amountOfThreshold = computed(() => {
      if ('multisig' in selectedTransaction.value && selectedTransaction.value.multisig) {
        return selectedTransaction.value.multisig.threshold;
      }
      return 0;
    });
    const alreadySigned = computed(() => {
      if ('multisig' in selectedTransaction.value && selectedTransaction.value.multisig) {
        return selectedTransaction.value.multisig.numApprovals;
      }
      return 0;
    });
    const progressPercentageMstSigned = computed(() => (alreadySigned.value / amountOfThreshold.value) * 100);
    const amountOfDaysBeforeExpirationTrx = computed(() => {
      if ('deadline' in selectedTransaction.value && selectedTransaction.value.deadline) {
        const secondsInADay = 86400;
        const daysRemaining = Math.ceil(selectedTransaction.value.deadline.secondsRemaining / secondsInADay);
        return `${daysRemaining}D`;
      }
      return '0';
    });

    const getStatusClassValue = (failed = false): Array<string> => {
      const baseClass = 'transaction-status';
      const classes = [baseClass];

      if (failed) {
        classes.push(`${baseClass}--error`);
      }

      return classes;
    };

    const getMainAccountName = (): string => {
      const addressOfMainAccount = api.formatAddress(api?.mst?.getPrevoiusAccount());
      const pair = api.getAccountPair(addressOfMainAccount);
      const accountName = pair.meta.name as string;
      return accountName.length > 10 ? `${accountName.slice(0, 10)}...` : accountName;
    };

    const getCurrentAmountOfXorOfSigner = async (): Promise<void> => {
      const address = api?.mst?.getPrevoiusAccount();
      if (!address) {
        currentAmountOfXorSignerHas.value = 0;
        return;
      }
      const addressOfMainAccount = api.formatAddress(api?.mst?.getPrevoiusAccount());
      const pair = api.getAccountPair(addressOfMainAccount);
      const xorBalance = await api.assets.getAccountAsset(XOR.address, pair.address);
      currentAmountOfXorSignerHas.value = getFPNumberFromCodec(xorBalance.balance.free, 18).toNumber();
    };

    const fetchMinAmountOfXor = async (): Promise<void> => {
      if (isMST.value && isTransactionNotSigned.value && isNotTheAccountInitiatedTrx.value) {
        try {
          const callHash = selectedTransaction.value.id;
          if (!callHash) {
            throw new Error('Call hash not found in selected transaction');
          }
          const { finalProofSize } = await api.mst.calculateFinalProofSize(
            callHash,
            (account.value as PolkadotJsAccount).address
          );
          minAmountOfXorForSign.value = finalProofSize.toNumber();
        } catch (error) {
          console.error('Failed to fetch minimum XOR amount for signing:', error);
          minAmountOfXorForSign.value = 0;
        }
      } else {
        minAmountOfXorForSign.value = 0;
      }
    };

    const fetchMinAmountOfXorOnChange = async (): Promise<void> => {
      await nextTick();
      await fetchMinAmountOfXor();
    };

    const onSignButtonClick = async (): Promise<void> => {
      try {
        const callHash = selectedTransaction.value.id;

        if (!callHash) {
          throw new Error('Call hash not found in selected transaction');
        }

        const multisigAccountAddress = selectedTransaction.value.from;

        if (!multisigAccountAddress) {
          throw new Error('No multisigAccountAddress');
        }
        await api.mst.approveMultisigExtrinsic(callHash, multisigAccountAddress);
        emit('backToWallet');
        showAppNotification('Transaction has been signed!', 'success');
      } catch (e) {
        console.info(e);
        emit('backToWallet');
        showAppNotification('Transaction has not been signed!', 'error');
      }
    };

    const getNetworkFee = (): Nullable<string> => {
      const xorFee = (selectedTransaction.value as any).xorFee;
      const assetFee = (selectedTransaction.value as any).assetFee;
      const networkFee = selectedTransaction.value.soraNetworkFee;

      if (!networkFee) return null;

      const networkFeeFormatted = `${formatCodecNumber(networkFee)} ${networkFeeSymbol}`;

      if (xorFee && assetFee) {
        const aFee = getFPNumber(assetFee);
        const xFee = getFPNumber(xorFee);

        if (FPNumber.isEqualTo(aFee, FPNumber.ZERO)) return networkFeeFormatted;

        const sign = FPNumber.isGreaterThan(xFee, FPNumber.ZERO) ? '+' : '';
        const complex = [
          { amount: aFee, symbol: transactionSymbol.value },
          { amount: xFee, symbol: networkFeeSymbol },
        ]
          .filter((part) => !part.amount.isZero())
          .map(({ amount, symbol }) => `${amount.toLocaleString()} ${symbol}`)
          .join(sign);

        return `${networkFeeFormatted} (${complex})`;
      }

      return networkFeeFormatted;
    };

    const getTransactionId = (): { type: HashType; value: Nullable<string> } => {
      if (selectedTransaction.value.txId) {
        return {
          type: HashType.ID,
          value: selectedTransaction.value.txId,
        };
      }

      return {
        type: HashType.Block,
        value: selectedTransaction.value.blockId,
      };
    };

    const getTransactionTranslation = (isBlock = false): string => {
      return isBlock ? 'transaction.blockId' : 'transaction.txId';
    };

    const getTransactionHashData = (): {
      value: Nullable<string>;
      hash: Nullable<string>;
      translation: string;
      type: HashType;
      block: Nullable<string>;
    } => {
      const { value, type } = getTransactionId();
      const hash = selectedTransaction.value.txId;
      const translation = getTransactionTranslation(type === HashType.Block);
      const block = type === HashType.ID ? selectedTransaction.value.blockId : undefined;

      return { value, hash, translation, type, block };
    };

    watch(
      selectedTransaction,
      () => {
        void fetchMinAmountOfXorOnChange();
      },
      { immediate: true, deep: true }
    );

    onMounted(() => {
      void fetchMinAmountOfXor();
      void getCurrentAmountOfXorOfSigner();
    });

    return {
      t,
      HashType,
      selectedTransaction,
      isCompleteTransaction,
      statusClass,
      statusTitle,
      errorMessage,
      transactionFromDate,
      transactionAmount,
      transactionAmountUSD,
      transactionSymbol,
      transactionSymbol2,
      vestingPercentage,
      vestingPeriod,
      vestingStartDate,
      transactionAmount2,
      transactionAmount2USD,
      amountOfDaysBeforeExpirationTrx,
      isMST,
      isTransactionNotSigned,
      isNotTheAccountInitiatedTrx,
      minAmountOfXorForSign,
      currentAmountOfXorSignerHas,
      xor,
      getMainAccountName,
      transactionFee,
      transactionComment,
      transactionFromAddress,
      transactionToAddress,
      isSetReferralOperation,
      isReferrer,
      transactionFromHash,
      amountOfThreshold,
      alreadySigned,
      progressPercentageMstSigned,
      isAdarOperation,
      onSignButtonClick,
    };
  },
};
</script>

<style lang="scss">
.transaction {
  &-status {
    text-transform: capitalize;

    &--error {
      color: var(--s-color-status-error);
    }
  }
}
</style>

<style scoped lang="scss">
.transaction {
  .s-icon-basic-check-mark-24 {
    margin-left: var(--s-basic-spacing);
  }

  .info-line-container {
    margin-bottom: #{$basic-spacing-medium};
  }

  .formatted-amount__divider {
    margin-right: #{$basic-spacing-extra-mini};
    margin-left: #{$basic-spacing-extra-mini};
  }

  & + & {
    margin-top: #{$basic-spacing-big};
  }

  &-network {
    text-align: center;
    margin-bottom: var(--s-basic-spacing);
  }
}

.history {
  align-items: center;

  &-info {
    flex: 1;
    flex-direction: column;
    font-size: var(--s-font-size-mini);

    &_date {
      color: var(--s-color-base-content-tertiary);
    }
  }

  &:not(:last-child) {
    margin-bottom: var(--s-basic-spacing);
  }
}

.sign-btn {
  margin-top: 16px;
  width: 100%;
}

.amount-of-signatures {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 12px;
  margin-top: 24px;

  .already-signed {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    font-weight: 800;
    color: var(--s-color-base-content-secondary);

    span {
      color: var(--s-color-status-success);
    }
  }

  .progress-bar-container {
    background-color: #f4f0f1;
    height: 6px;
    border-radius: 4px;
    overflow: hidden;

    .progress-bar {
      background-color: var(--s-color-status-success);
      height: 100%;
      border-radius: 4px;
    }
  }
}

.xor-min-amount {
  margin-top: 8px;

  span {
    margin-left: 60px;
  }
}
</style>
