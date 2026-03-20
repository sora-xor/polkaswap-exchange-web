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
import { defineComponent } from 'vue';
import { mapGetters, mapState } from 'vuex';

import { api } from '../api';
import { HashType } from '../consts';

import InfoLine from './InfoLine.vue';
import EthBridgeTransactionMixin from './mixins/EthBridgeTransactionMixin';
import NotificationMixin from './mixins/NotificationMixin';
import NumberFormatterMixin from './mixins/NumberFormatterMixin';
import TranslationMixin from './mixins/TranslationMixin';
import TokenLogo from './TokenLogo.vue';
import TransactionHashView from './TransactionHashView.vue';
import AdarTxDetails from './WalletAdarTxDetails.vue';

import type { PolkadotJsAccount, AssetsTable } from '../types/common';
import type { HistoryItem } from '@sora-substrate/sdk';

export default defineComponent({
  components: {
    InfoLine,
    TokenLogo,
    TransactionHashView,
    AdarTxDetails,
  },
  mixins: [TranslationMixin, NumberFormatterMixin, EthBridgeTransactionMixin, NotificationMixin],
  emits: ['backToWallet'],
  data() {
    return {
      HashType,
      minAmountOfXorForSign: 0,
      currentAmountOfXorSignerHas: 0,
    };
  },
  computed: {
    ...mapState('wallet/settings', ['blockNumber']),
    ...mapGetters('wallet/account', ['assetsDataTable', 'account']),
    ...mapGetters('wallet/transactions', { selectedTransaction: 'selectedTx' }),
    isCompleteTransaction(this: any): boolean {
      return [TransactionStatus.InBlock, TransactionStatus.Finalized].includes(
        this.selectedTransaction.status as TransactionStatus
      );
    },
    isFailedTransaction(this: any): boolean {
      return [TransactionStatus.Error, TransactionStatus.Invalid].includes(
        this.selectedTransaction.status as TransactionStatus
      );
    },
    statusClass(this: any): Array<string> {
      return this.getStatusClass(this.isFailedTransaction);
    },
    statusTitle(this: any): string {
      if (this.isFailedTransaction) {
        return this.t('transaction.statuses.failed');
      }
      if (this.isCompleteTransaction) {
        return this.t('transaction.statuses.complete');
      }
      return this.t('transaction.statuses.pending');
    },
    transactionAmount(this: any): string {
      return this.formatStringValue(this.selectedTransaction.amount as string);
    },
    transactionAmountUSD(this: any): string {
      const amountUSD = this.selectedTransaction.payload?.amountUSD;
      return amountUSD ? this.formatStringValue(amountUSD) : '';
    },
    transactionAmount2(this: any): string {
      return this.formatStringValue(this.selectedTransaction.amount2 as string);
    },
    transactionAmount2USD(this: any): string {
      const amountUSD = this.selectedTransaction.payload?.amount2USD;
      return amountUSD ? this.formatStringValue(amountUSD) : '';
    },
    transactionSymbol(this: any): string {
      const { type, symbol, symbol2 } = this.selectedTransaction;

      if ([Operation.DemeterFarmingDepositLiquidity, Operation.DemeterFarmingWithdrawLiquidity].includes(type)) {
        return `${symbol}-${symbol2}`;
      }

      if (Operation.OrderBookPlaceLimitOrder) {
        const { assetAddress } = this.selectedTransaction;
        const asset = assetAddress ? (this.assetsDataTable as AssetsTable)[assetAddress] : null;

        if (asset) {
          return asset.symbol;
        }
      }

      return symbol || '';
    },
    transactionSymbol2(this: any): string {
      if (Operation.OrderBookPlaceLimitOrder) {
        const { asset2Address } = this.selectedTransaction;
        const asset = asset2Address ? (this.assetsDataTable as AssetsTable)[asset2Address] : null;

        if (asset) {
          return asset.symbol;
        }
      }

      return this.selectedTransaction.symbol2 || '';
    },
    isRecipient(this: any): boolean {
      return (this.account as PolkadotJsAccount).address !== this.selectedTransaction.from;
    },
    transactionFee(this: any): Nullable<string> {
      if (this.isRecipient) {
        return null;
      }
      return this.getNetworkFee();
    },
    transactionFromDate(this: any): Nullable<string> {
      if (!this.selectedTransaction.startTime) return null;

      return this.formatDate(this.selectedTransaction.startTime as number);
    },
    transactionFromAddress(this: any): Nullable<string> {
      return this.selectedTransaction.from;
    },
    transactionToAddress(this: any): Nullable<string> {
      return this.selectedTransaction.to;
    },
    transactionFromHash(this: any) {
      return this.getTransactionHashData();
    },
    transactionComment(this: any): Nullable<string> {
      return (this.selectedTransaction as any).comment || null;
    },
    isSetReferralOperation(this: any): boolean {
      return this.selectedTransaction.type === Operation.ReferralSetInvitedUser;
    },
    vestingPercentage(this: any): Nullable<string> {
      if (!('percent' in this.selectedTransaction)) return null;
      return `${this.selectedTransaction.percent}`;
    },
    vestingPeriod(this: any): Nullable<string> {
      if (!('period' in this.selectedTransaction)) return null;
      const periodInMs = this.selectedTransaction.period * 6_000;
      return dayjs.duration(periodInMs).locale(this.dayjsLocale).humanize();
    },
    vestingStartDate(this: any): Nullable<string> {
      if (!('start' in this.selectedTransaction)) return null;
      const diffBlock = this.selectedTransaction.start - this.blockNumber;
      const diffMs = diffBlock * 6_000;
      return this.formatDate(Date.now() + diffMs, 'll LT');
    },
    isReferrer(this: any): boolean {
      return this.isSetReferralOperation && (this.account as PolkadotJsAccount).address === this.selectedTransaction.to;
    },
    errorMessage(this: any): Nullable<string> {
      const error = this.selectedTransaction.errorMessage;
      if (!error) {
        return null;
      }

      let errMessage = this.t(`historyErrorMessages.generalError`);

      if (typeof error === 'string') {
        return errMessage;
      }

      if (error.name && error.section) {
        errMessage = this.t(`historyErrorMessages.${error.section.toLowerCase()}.${error.name.toLowerCase()}`);
        if (errMessage.startsWith('historyErrorMessages')) {
          return this.t(`historyErrorMessages.generalError`);
        }
      }

      return errMessage;
    },
    isAdarOperation(this: any): boolean {
      return this.selectedTransaction.type === Operation.SwapTransferBatch;
    },
    networkFeeSymbol(): string {
      return KnownSymbols.XOR;
    },
    isTransactionToCompleted(this: any): boolean {
      return this.isEthBridgeTxToCompleted(this.selectedTransaction);
    },
    isMST(): boolean {
      return api.mst.isMST();
    },
    xor(): string {
      return XOR.symbol;
    },
    isTransactionNotSigned(this: any): boolean {
      return this.selectedTransaction.status === TransactionStatus.Pending;
    },
    isNotTheAccountInitiatedTrx(this: any): boolean {
      console.info(this.selectedTransaction);
      const addressOfMainAccount = api.formatAddress(api?.mst?.getPrevoiusAccount());
      if ('multisig' in this.selectedTransaction && this.selectedTransaction.multisig) {
        return addressOfMainAccount !== this.selectedTransaction.multisig.signatories[0];
      }
      return false;
    },
    amountOfThreshold(this: any): number {
      if ('multisig' in this.selectedTransaction && this.selectedTransaction.multisig) {
        return this.selectedTransaction.multisig.threshold;
      }
      return 0;
    },
    alreadySigned(this: any): number {
      if ('multisig' in this.selectedTransaction && this.selectedTransaction.multisig) {
        return this.selectedTransaction.multisig.numApprovals;
      }
      return 0;
    },
    progressPercentageMstSigned(this: any): number {
      return (this.alreadySigned / this.amountOfThreshold) * 100;
    },
    amountOfDaysBeforeExpirationTrx(this: any): string {
      if ('deadline' in this.selectedTransaction && this.selectedTransaction.deadline) {
        const secondsInADay = 86400;
        const daysRemaining = Math.ceil(this.selectedTransaction.deadline.secondsRemaining / secondsInADay);
        return `${daysRemaining}D`;
      }
      return '0';
    },
  },
  watch: {
    selectedTransaction: {
      immediate: true,
      deep: true,
      async handler(this: any): Promise<void> {
        await this.fetchMinAmountOfXorOnChange();
      },
    },
  },
  mounted(this: any): void {
    void this.fetchMinAmountOfXor();
    void this.getCurrentAmountOfXorOfSigner();
  },
  methods: {
    async fetchMinAmountOfXorOnChange(this: any): Promise<void> {
      await this.$nextTick();
      await this.fetchMinAmountOfXor();
    },
    getMainAccountName(this: any): string {
      const addressOfMainAccount = api.formatAddress(api?.mst?.getPrevoiusAccount());
      const pair = api.getAccountPair(addressOfMainAccount);
      const accountName = pair.meta.name as string;
      return accountName.length > 10 ? `${accountName.slice(0, 10)}...` : accountName;
    },
    async getCurrentAmountOfXorOfSigner(this: any): Promise<void> {
      const address = api?.mst?.getPrevoiusAccount();
      if (!address) {
        this.currentAmountOfXorSignerHas = 0;
        return;
      }
      const addressOfMainAccount = api.formatAddress(api?.mst?.getPrevoiusAccount());
      const pair = api.getAccountPair(addressOfMainAccount);
      const xorBalance = await api.assets.getAccountAsset(XOR.address, pair.address);
      this.currentAmountOfXorSignerHas = this.getFPNumberFromCodec(xorBalance.balance.free, 18).toNumber();
    },
    async fetchMinAmountOfXor(this: any): Promise<void> {
      if (this.isMST && this.isTransactionNotSigned && this.isNotTheAccountInitiatedTrx) {
        try {
          const callHash = this.selectedTransaction.id;
          if (!callHash) {
            throw new Error('Call hash not found in selected transaction');
          }
          const { finalProofSize } = await api.mst.calculateFinalProofSize(
            callHash,
            (this.account as PolkadotJsAccount).address
          );
          this.minAmountOfXorForSign = finalProofSize.toNumber();
        } catch (error) {
          console.error('Failed to fetch minimum XOR amount for signing:', error);
          this.minAmountOfXorForSign = 0;
        }
      } else {
        this.minAmountOfXorForSign = 0;
      }
    },
    getNetworkFeeSymbol(this: any, isSoraTx = true): string {
      return isSoraTx ? KnownSymbols.XOR : KnownSymbols.ETH;
    },
    async onSignButtonClick(this: any): Promise<void> {
      try {
        const callHash = this.selectedTransaction.id;

        if (!callHash) {
          throw new Error('Call hash not found in selected transaction');
        }

        const multisigAccountAddress = this.selectedTransaction.from;

        if (!multisigAccountAddress) {
          throw new Error('No multisigAccountAddress');
        }
        console.info('we are in onSignButtonClick');
        await api.mst.approveMultisigExtrinsic(callHash, multisigAccountAddress);
        this.$emit('backToWallet');
        this.showAppNotification('Transaction has been signed!', 'success');
      } catch (e) {
        console.info(e);
        this.$emit('backToWallet');
        this.showAppNotification('Transaction has not been signed!', 'error');
      }
    },
    getNetworkFee(this: any): Nullable<string> {
      const xorFee = (this.selectedTransaction as any).xorFee;
      const assetFee = (this.selectedTransaction as any).assetFee;
      const networkFee = this.selectedTransaction.soraNetworkFee;

      if (!networkFee) return null;

      const networkFeeFormatted = `${this.formatCodecNumber(networkFee)} ${this.networkFeeSymbol}`;

      if (xorFee && assetFee) {
        const aFee = this.getFPNumber(assetFee);
        const xFee = this.getFPNumber(xorFee);

        if (FPNumber.isEqualTo(aFee, FPNumber.ZERO)) return networkFeeFormatted;

        const sign = FPNumber.isGreaterThan(xFee, FPNumber.ZERO) ? '+' : '';
        const complex = [
          { amount: aFee, symbol: this.transactionSymbol },
          { amount: xFee, symbol: this.networkFeeSymbol },
        ]
          .filter((part) => !part.amount.isZero())
          .map(({ amount, symbol }) => `${amount.toLocaleString()} ${symbol}`)
          .join(sign);

        return `${networkFeeFormatted} (${complex})`;
      }

      return networkFeeFormatted;
    },
    getTransactionHashData(this: any): {
      value: Nullable<string>;
      hash: Nullable<string>;
      translation: string;
      type: HashType;
      block: Nullable<string>;
    } {
      const { value, type } = this.getTransactionId();
      const hash = this.selectedTransaction.txId;
      const translation = this.getTransactionTranslation(type === HashType.Block);
      const block = type === HashType.ID ? this.selectedTransaction.blockId : undefined;

      return { value, hash, translation, type, block };
    },
    getTransactionId(this: any): { type: HashType; value: Nullable<string> } {
      if (this.selectedTransaction.txId) {
        return {
          type: HashType.ID,
          value: this.selectedTransaction.txId,
        };
      }

      return {
        type: HashType.Block,
        value: this.selectedTransaction.blockId,
      };
    },
    getTransactionTranslation(this: any, isBlock = false): string {
      return isBlock ? 'transaction.blockId' : 'transaction.txId';
    },
    getStatusClass(_this: any, isFailedTransaction = false): Array<string> {
      const baseClass = 'transaction-status';
      const classes = [baseClass];

      if (isFailedTransaction) {
        classes.push(`${baseClass}--error`);
      }

      return classes;
    },
  },
});
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
