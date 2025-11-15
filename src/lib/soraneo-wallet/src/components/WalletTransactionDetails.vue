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
import { Options, mixins, Watch } from 'vue-property-decorator';

import { api } from '../api';
import { HashType } from '../consts';
import { getter, state } from '../store/decorators';

import FormattedAmount from './FormattedAmount.vue';
import InfoLine from './InfoLine.vue';
import EthBridgeTransactionMixin from './mixins/EthBridgeTransactionMixin';
import NotificationMixin from './mixins/NotificationMixin';
import NumberFormatterMixin from './mixins/NumberFormatterMixin';
import TranslationMixin from './mixins/TranslationMixin';
import TokenLogo from './TokenLogo.vue';
import TransactionHashView from './TransactionHashView.vue';
import AdarTxDetails from './WalletAdarTxDetails.vue';
import WalletBase from './WalletBase.vue';

import type { PolkadotJsAccount, AssetsTable } from '../types/common';
import type { HistoryItem } from '@sora-substrate/sdk';
@Options({
  components: {
    WalletBase,
    InfoLine,
    TokenLogo,
    FormattedAmount,
    TransactionHashView,
    AdarTxDetails,
  },
})
export default class WalletTransactionDetails extends mixins(
  TranslationMixin,
  NumberFormatterMixin,
  EthBridgeTransactionMixin,
  NotificationMixin
) {
  readonly HashType = HashType;

  @state.settings.blockNumber private blockNumber!: number;

  @getter.account.assetsDataTable private assetsDataTable!: AssetsTable;
  @getter.account.account private account!: PolkadotJsAccount;
  @getter.transactions.selectedTx selectedTransaction!: HistoryItem; // It shouldn't be empty

  minAmountOfXorForSign = 0;
  currentAmountOfXorSignerHas = 0;

  mounted() {
    this.fetchMinAmountOfXor();
    this.getCurrentAmountOfXorOfSigner();
  }

  @Watch('selectedTransaction', { immediate: true, deep: true })
  private async fetchMinAmountOfXorOnChange(): Promise<void> {
    await this.$nextTick();
    this.fetchMinAmountOfXor();
  }

  get isCompleteTransaction(): boolean {
    return [TransactionStatus.InBlock, TransactionStatus.Finalized].includes(
      this.selectedTransaction.status as TransactionStatus
    );
  }

  get isFailedTransaction(): boolean {
    return [TransactionStatus.Error, TransactionStatus.Invalid].includes(
      this.selectedTransaction.status as TransactionStatus
    );
  }

  get statusClass(): Array<string> {
    return this.getStatusClass(this.isFailedTransaction);
  }

  // Transaction status
  get statusTitle(): string {
    if (this.isFailedTransaction) {
      return this.t('transaction.statuses.failed');
    }
    if (this.isCompleteTransaction) {
      return this.t('transaction.statuses.complete');
    }
    return this.t('transaction.statuses.pending');
  }

  get transactionAmount(): string {
    return this.formatStringValue(this.selectedTransaction.amount as string);
  }

  get transactionAmountUSD(): string {
    const amountUSD = this.selectedTransaction.payload?.amountUSD;
    return amountUSD ? this.formatStringValue(amountUSD) : '';
  }

  get transactionAmount2(): string {
    return this.formatStringValue(this.selectedTransaction.amount2 as string);
  }

  get transactionAmount2USD(): string {
    const amountUSD = this.selectedTransaction.payload?.amount2USD;
    return amountUSD ? this.formatStringValue(amountUSD) : '';
  }

  get transactionSymbol(): string {
    const { type, symbol, symbol2 } = this.selectedTransaction;

    if ([Operation.DemeterFarmingDepositLiquidity, Operation.DemeterFarmingWithdrawLiquidity].includes(type)) {
      return `${symbol}-${symbol2}`;
    }

    if (Operation.OrderBookPlaceLimitOrder) {
      const { assetAddress } = this.selectedTransaction;
      const asset = assetAddress ? this.assetsDataTable[assetAddress] : null;

      if (asset) {
        return asset.symbol;
      }
    }

    return symbol || '';
  }

  get transactionSymbol2(): string {
    if (Operation.OrderBookPlaceLimitOrder) {
      const { asset2Address } = this.selectedTransaction;
      const asset = asset2Address ? this.assetsDataTable[asset2Address] : null;

      if (asset) {
        return asset.symbol;
      }
    }

    return this.selectedTransaction.symbol2 || '';
  }

  get isRecipient(): boolean {
    return this.account.address !== this.selectedTransaction.from;
  }

  get transactionFee(): Nullable<string> {
    if (this.isRecipient) {
      return null;
    }
    return this.getNetworkFee();
  }

  get transactionFromDate(): Nullable<string> {
    if (!this.selectedTransaction.startTime) return null;

    return this.formatDate(this.selectedTransaction.startTime as number);
  }

  get transactionFromAddress(): Nullable<string> {
    return this.selectedTransaction.from;
  }

  get transactionToAddress(): Nullable<string> {
    return this.selectedTransaction.to;
  }

  get transactionFromHash() {
    return this.getTransactionHashData();
  }

  get transactionComment(): Nullable<string> {
    return (this.selectedTransaction as any).comment || null;
  }

  get isSetReferralOperation(): boolean {
    return this.selectedTransaction.type === Operation.ReferralSetInvitedUser;
  }

  get vestingPercentage(): Nullable<string> {
    if (!('percent' in this.selectedTransaction)) return null;
    return `${this.selectedTransaction.percent}`;
  }

  get vestingPeriod(): Nullable<string> {
    if (!('period' in this.selectedTransaction)) return null;
    const periodInMs = this.selectedTransaction.period * 6_000; // 6 seconds per block
    return dayjs.duration(periodInMs).locale(this.dayjsLocale).humanize();
  }

  get vestingStartDate(): Nullable<string> {
    if (!('start' in this.selectedTransaction)) return null;
    const diffBlock = this.selectedTransaction.start - this.blockNumber;
    const diffMs = diffBlock * 6_000; // 6 seconds per block
    return this.formatDate(Date.now() + diffMs, 'll LT');
  }

  get isReferrer(): boolean {
    return this.isSetReferralOperation && this.account.address === this.selectedTransaction.to;
  }

  get errorMessage(): Nullable<string> {
    const error = this.selectedTransaction.errorMessage;
    if (!error) {
      return null;
    }

    let errMessage = this.t(`historyErrorMessages.generalError`);

    if (typeof error === 'string') {
      return errMessage; // Backward compatibility
    }

    if (error.name && error.section) {
      errMessage = this.t(`historyErrorMessages.${error.section.toLowerCase()}.${error.name.toLowerCase()}`);
      if (errMessage.startsWith('historyErrorMessages')) {
        // was not found in json files
        return this.t(`historyErrorMessages.generalError`);
      }
    }

    return errMessage;
  }

  // ____________________________________________________ADAR____________________________________________________________
  get isAdarOperation(): boolean {
    return this.selectedTransaction.type === Operation.SwapTransferBatch;
  }
  // ____________________________________________________________________________________________________________________

  get networkFeeSymbol(): string {
    return KnownSymbols.XOR;
  }

  // ETH BRIDGE transaction
  get isTransactionToCompleted(): boolean {
    return this.isEthBridgeTxToCompleted(this.selectedTransaction);
  }

  get isMST(): boolean {
    return api.mst.isMST();
  }

  get xor(): string {
    return XOR.symbol;
  }

  get isTransactionNotSigned(): boolean {
    return this.selectedTransaction.status === TransactionStatus.Pending;
  }

  get isNotTheAccountInitiatedTrx(): boolean {
    console.info(this.selectedTransaction);
    const addressOfMainAccount = api.formatAddress(api?.mst?.getPrevoiusAccount());
    if ('multisig' in this.selectedTransaction && this.selectedTransaction.multisig) {
      return addressOfMainAccount !== this.selectedTransaction.multisig.signatories[0];
    } else {
      return false;
    }
  }

  getMainAccountName(): string {
    const addressOfMainAccount = api.formatAddress(api?.mst?.getPrevoiusAccount());
    const pair = api.getAccountPair(addressOfMainAccount);
    const accountName = pair.meta.name as string;
    return accountName.length > 10 ? accountName.slice(0, 10) + '...' : accountName;
  }

  get amountOfThreshold(): number {
    if ('multisig' in this.selectedTransaction && this.selectedTransaction.multisig) {
      return this.selectedTransaction.multisig.threshold;
    } else {
      return 0;
    }
  }

  get alreadySigned(): number {
    if ('multisig' in this.selectedTransaction && this.selectedTransaction.multisig) {
      return this.selectedTransaction.multisig.numApprovals;
    } else {
      return 0;
    }
  }

  get progressPercentageMstSigned(): number {
    return (this.alreadySigned / this.amountOfThreshold) * 100;
  }

  get amountOfDaysBeforeExpirationTrx(): string {
    if ('deadline' in this.selectedTransaction && this.selectedTransaction.deadline) {
      const secondsInADay = 86400;
      const daysRemaining = Math.ceil(this.selectedTransaction.deadline.secondsRemaining / secondsInADay);
      return `${daysRemaining}D`;
    } else {
      return '0';
    }
  }

  public async getCurrentAmountOfXorOfSigner() {
    const address = api?.mst?.getPrevoiusAccount();
    if (!address) {
      this.currentAmountOfXorSignerHas = 0;
      return;
    }
    const addressOfMainAccount = api.formatAddress(api?.mst?.getPrevoiusAccount());
    const pair = api.getAccountPair(addressOfMainAccount);
    const xorBalance = await api.assets.getAccountAsset(XOR.address, pair.address);
    this.currentAmountOfXorSignerHas = this.getFPNumberFromCodec(xorBalance.balance.free, 18).toNumber();
  }

  public async fetchMinAmountOfXor() {
    if (this.isMST && this.isTransactionNotSigned && this.isNotTheAccountInitiatedTrx) {
      try {
        const callHash = this.selectedTransaction.id;
        if (!callHash) {
          throw new Error('Call hash not found in selected transaction');
        }
        const { finalProofSize } = await api.mst.calculateFinalProofSize(callHash, this.account.address);
        const proofSizeNumber = finalProofSize.toNumber();
        this.minAmountOfXorForSign = proofSizeNumber;
      } catch (error) {
        console.error('Failed to fetch minimum XOR amount for signing:', error);
        this.minAmountOfXorForSign = 0;
      }
    } else {
      this.minAmountOfXorForSign = 0;
    }
  }

  public getNetworkFeeSymbol(isSoraTx = true): string {
    return isSoraTx ? KnownSymbols.XOR : KnownSymbols.ETH;
  }

  public async onSignButtonClick(): Promise<void> {
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
  }

  private getNetworkFee(): Nullable<string> {
    // [TODO] update History in js-lib
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
  }

  private getTransactionHashData(): {
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
  }

  private getTransactionId(): { type: HashType; value: Nullable<string> } {
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
  }

  private getTransactionTranslation(isBlock = false): string {
    return isBlock ? 'transaction.blockId' : 'transaction.txId';
  }

  private getStatusClass(isFailedTransaction = false): Array<string> {
    const baseClass = 'transaction-status';
    const classes = [baseClass];

    if (isFailedTransaction) {
      classes.push(`${baseClass}--error`);
    }

    return classes;
  }
}
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
