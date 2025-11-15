<template>
  <wallet-base :title="headerTitle" show-back :reset-focus="hasResetFocus" @back="handleBack">
    <template v-if="!selectedTransaction" #actions>
      <s-button v-if="!isXor" type="action" :tooltip="t('asset.remove')" @click="handleRemoveAsset">
        <s-icon name="basic-eye-24" size="28"></s-icon>
      </s-button>
    </template>
    <template v-if="!selectedTransaction">
      <s-card class="asset-details" primary>
        <div class="asset-details-container s-flex">
          <nft-details
            v-if="isNft"
            is-asset-details
            :content-link="nftContentLink"
            :token-name="asset.name"
            :token-symbol="asset.symbol"
            :token-description="asset.description"
            @click-details="handleClickNftDetails"
          ></nft-details>
          <template v-else>
            <token-logo :token="asset" size="bigger"></token-logo>
            <div
              v-button
              :style="balanceStyles"
              :class="balanceDetailsClasses"
              :tabindex="0"
              @click="handleClickDetailedBalance()"
            >
              <formatted-amount
                value-can-be-hidden
                symbol-as-decimal
                :value="balance"
                :font-size-rate="FontSizeRate.SMALL"
                :asset-symbol="asset.symbol"
              >
                <s-icon name="chevron-down-rounded-16" size="18"></s-icon>
              </formatted-amount>
            </div>
          </template>
          <formatted-amount
            v-if="price && !isNft"
            value-can-be-hidden
            is-fiat-value
            :value="getFiatBalance(asset)"
            :font-size-rate="FontSizeRate.MEDIUM"
          ></formatted-amount>
          <div class="asset-details-actions">
            <s-button
              v-for="operation in operations"
              :key="operation.type"
              :class="['asset-details-action', operation.type]"
              :tooltip="getOperationTooltip(operation)"
              :disabled="isOperationDisabled(operation.type)"
              type="action"
              size="medium"
              rounded
              primary
              @click="handleOperation(operation.type)"
            >
              <s-icon :name="operation.icon" size="24"></s-icon>
            </s-button>

            <qr-code-scan-button primary size="medium" @change="parseQrCodeValue"></qr-code-scan-button>

            <s-button type="action" primary rounded :tooltip="t('code.receive')" @click="receiveByQrCode(asset)">
              <s-icon name="finance-receive-show-QR-24" size="24"></s-icon>
            </s-button>
          </div>
          <transition name="fadeHeight">
            <div v-if="wasBalanceDetailsClicked" class="asset-details-balance-info">
              <template v-for="(balanceGroup, index) in balanceTypes">
                <div
                  v-for="balanceType in Array.isArray(balanceGroup) ? balanceGroup : [balanceGroup]"
                  :key="balanceType"
                  class="balance s-flex p4"
                >
                  <div :class="['balance-label', { 'balance-label--total': index === balanceTypes.length - 1 }]">
                    <template v-if="Array.isArray(balanceGroup)"> - </template>
                    {{ t(`assets.balance.${balanceType}`) }}
                  </div>
                  <formatted-amount-with-fiat-value
                    value-can-be-hidden
                    value-class="balance-value"
                    :value="formatBalance(asset.balance[balanceType])"
                    :font-size-rate="FontSizeRate.MEDIUM"
                    :font-weight-rate="FontWeightRate.SMALL"
                    :asset-symbol="asset.symbol"
                    :fiat-value="getFiatBalance(asset, balanceType)"
                    fiat-format-as-value
                    with-left-shift
                  ></formatted-amount-with-fiat-value>
                </div>
              </template>
            </div>
          </transition>
        </div>
      </s-card>
      <div v-if="isNft" class="asset-details-nft-container">
        <transition name="fadeHeight">
          <div v-if="wasNftDetailsClicked" class="info-line-container">
            <info-line :label="t('createToken.nft.supply.quantity')" :value="balance"></info-line>
            <info-line
              v-button
              class="external-link"
              :label="t('createToken.nft.source.label')"
              :value="displayedNftContentLink"
              :value-tooltip="nftLinkTooltipText"
              @click.stop="handleCopyNftLink"
            ></info-line>
          </div>
        </transition>
      </div>
    </template>
    <wallet-transaction-details v-else></wallet-transaction-details>
    <wallet-history v-show="!selectedTransaction" :asset="asset"></wallet-history>
  </wallet-base>
</template>

<script lang="ts">
import { XOR, BalanceType } from '@sora-substrate/sdk/build/assets/consts';
import { Options, mixins } from 'vue-property-decorator';

import { api } from '../api';
import { useRouterStore } from '@/stores/router';

import { RouteNames } from '../consts';
import { state, getter, mutation } from '../store/decorators';
import { Operations } from '../types/common';
import { copyToClipboard, delay, shortenValue } from '../util';
import { IpfsStorage } from '../util/ipfsStorage';

import FormattedAmount from './FormattedAmount.vue';
import FormattedAmountWithFiatValue from './FormattedAmountWithFiatValue.vue';
import InfoLine from './InfoLine.vue';
import CopyAddressMixin from './mixins/CopyAddressMixin';
import FormattedAmountMixin from './mixins/FormattedAmountMixin';
import OperationsMixin from './mixins/OperationsMixin';
import QrCodeParserMixin from './mixins/QrCodeParserMixin';
import NftDetails from './NftDetails.vue';
import QrCodeScanButton from './QrCode/QrCodeScanButton.vue';
import TokenLogo from './TokenLogo.vue';
import WalletBase from './WalletBase.vue';
import WalletHistory from './WalletHistory.vue';
import WalletTransactionDetails from './WalletTransactionDetails.vue';

import type { WalletPermissions } from '../consts';
import type { CodecString, AccountHistory, HistoryItem } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

interface Operation {
  type: Operations;
  icon: string;
}

@Options({
  components: {
    WalletBase,
    FormattedAmount,
    FormattedAmountWithFiatValue,
    WalletHistory,
    WalletTransactionDetails,
    QrCodeScanButton,
    NftDetails,
    InfoLine,
    TokenLogo,
  },
})
export default class WalletAssetDetails extends mixins(
  OperationsMixin,
  FormattedAmountMixin,
  CopyAddressMixin,
  QrCodeParserMixin
) {
  readonly balanceTypes = [
    BalanceType.Transferable,
    BalanceType.Locked,
    [BalanceType.Frozen, BalanceType.Reserved, BalanceType.Bonded],
    BalanceType.Total,
  ];

  private get routerStore() {
    return useRouterStore((this as any).$pinia);
  }

  get currentRouteParams(): Record<string, AccountAsset> {
    return this.routerStore.currentParams as Record<string, AccountAsset>;
  }

  @state.settings.permissions private permissions!: WalletPermissions;
  @state.account.accountAssets private accountAssets!: Array<AccountAsset>;
  @state.transactions.history private history!: AccountHistory<HistoryItem>;
  @getter.transactions.selectedTx selectedTransaction!: Nullable<HistoryItem>;
  @mutation.transactions.resetTxDetailsId private resetTxDetailsId!: FnWithoutArgs;

  wasBalanceDetailsClicked = false;

  // ____________________NFT Token Details_____________________________
  private wasNftLinkCopied = false;
  wasNftDetailsClicked = false;
  nftContentLink = '';

  get hasResetFocus(): string {
    return this.selectedTransaction && this.selectedTransaction.id
      ? this.selectedTransaction.id.toString()
      : this.wasBalanceDetailsClicked.toString();
  }

  get isNft(): boolean {
    return api.assets.isNft(this.asset);
  }

  get headerTitle(): string {
    if (!this.selectedTransaction) return this.asset.name;

    return this.getTitle(this.selectedTransaction);
  }

  get nftLinkTooltipText(): string {
    // TODO: Remove assets.copy, assets.copied
    return this.wasNftLinkCopied ? this.t('copiedText') : this.t('createToken.nft.link.copyLink');
  }

  get displayedNftContentLink(): string {
    const hostname = IpfsStorage.getStorageHostname(this.nftContentLink);
    const path = IpfsStorage.getIpfsPath(this.nftContentLink);
    return shortenValue(hostname + '/ipfs/' + path, 25);
  }

  private async setNftMeta(): Promise<void> {
    const ipfsPath = this.asset.content as string;
    this.nftContentLink = IpfsStorage.constructFullIpfsUrl(ipfsPath);
  }

  handleClickNftDetails(): void {
    this.wasNftDetailsClicked = !this.wasNftDetailsClicked;
  }

  async handleCopyNftLink(): Promise<void> {
    await copyToClipboard(this.nftContentLink);
    this.wasNftLinkCopied = true;
    await delay(1000);
    this.wasNftLinkCopied = false;
  }

  mounted(): void {
    if (this.isNft) {
      this.setNftMeta();
    }
  }
  // __________________________________________________________

  formatBalance(value: CodecString): string {
    return this.formatCodecNumber(value, this.asset.decimals);
  }

  get operations(): Array<Operation> {
    const list: Array<Operation> = [];
    const divisible = !!this.asset.decimals;

    if (this.permissions.sendAssets) {
      list.push({ type: Operations.Send, icon: 'finance-send-24' });
    }
    if (this.permissions.swapAssets && divisible) {
      list.push({ type: Operations.Swap, icon: 'arrows-swap-24' });
    }
    if (this.permissions.addLiquidity && divisible) {
      list.push({ type: Operations.Liquidity, icon: 'basic-drop-24' });
    }
    if (this.permissions.bridgeAssets && divisible) {
      list.push({ type: Operations.Bridge, icon: 'grid-block-distribute-vertically-24' });
    }

    return list;
  }

  get price(): Nullable<CodecString> {
    return this.getAssetFiatPrice(this.asset);
  }

  get asset(): AccountAsset {
    // currentRouteParams.asset was added here to avoid a case when the asset is not found
    return (
      this.accountAssets.find(({ address }) => address === this.currentRouteParams.asset.address) ||
      this.currentRouteParams.asset
    );
  }

  get balance(): string {
    return this.formatCodecNumber(this.asset.balance.transferable, this.asset.decimals);
  }

  get totalBalance(): string {
    return this.formatBalance(this.asset.balance.total);
  }

  get isEmptyBalance(): boolean {
    return this.isCodecZero(this.asset.balance.transferable, this.asset.decimals);
  }

  get balanceStyles() {
    const balanceLength = this.balance.length;
    // We've decided to calcutate font size values manually
    let fontSize = 30;
    if (balanceLength > 35) {
      fontSize = 14;
    } else if (balanceLength > 24 && balanceLength <= 35) {
      fontSize = 16;
    } else if (balanceLength > 17 && balanceLength <= 24) {
      fontSize = 20;
    }
    return { fontSize: `${fontSize}px` };
  }

  get balanceDetailsClasses(): Array<string> {
    const cssClasses: Array<string> = ['asset-details-balance', 'd2'];
    if (this.isXor) {
      cssClasses.push('asset-details-balance--clickable');
    }
    if (this.wasBalanceDetailsClicked) {
      cssClasses.push('asset-details-balance--clicked');
    }
    return cssClasses;
  }

  get isXor(): boolean {
    return this.asset.address === XOR.address;
  }

  get isCleanHistoryDisabled(): boolean {
    if (!this.asset) return true;

    return Object.values(this.history).every(
      (item) => ![item.assetAddress, item.asset2Address].includes(this.asset.address)
    );
  }

  handleBack(): void {
    if (this.selectedTransaction) {
      this.resetTxDetailsId();
    } else {
      this.navigate({ name: RouteNames.Wallet });
    }
  }

  getOperationTooltip(operation: Operation): string {
    return this.t(`assets.${operation.type}`);
  }

  isOperationDisabled(operation: Operations): boolean {
    return operation === Operations.Send && this.isEmptyBalance;
  }

  handleOperation(operation: Operations): void {
    switch (operation) {
      case Operations.Send:
        this.navigate({ name: RouteNames.WalletSend, params: { asset: this.asset } });
        break;
      default:
        this.$emit(operation, this.asset);
        break;
    }
  }

  handleClickDetailedBalance(): void {
    this.wasBalanceDetailsClicked = !this.wasBalanceDetailsClicked;
  }

  getBalance(asset: AccountAsset, type: BalanceType): string {
    return `${this.formatCodecNumber(asset.balance[type], asset.decimals)}`;
  }

  handleRemoveAsset(): void {
    api.assets.removeAccountAsset(this.asset.address);
    this.handleBack();
  }
}
</script>

<style scoped lang="scss">
.asset-details {
  padding: 0 !important;
  margin-bottom: 0;
  border-radius: 0;
  &.s-card.neumorphic {
    padding-top: 0;
    padding-bottom: 0;
  }
  &-container {
    flex-direction: column;
    align-items: center;
    @include fadeHeight;
    .formatted-amount--fiat-value {
      + .asset-details-actions {
        margin-top: #{$basic-spacing-small};
        margin-bottom: #{$basic-spacing-medium};
      }
    }
  }
  &-nft-container {
    @include fadeHeight(50px, 0.1s);
  }
  &-balance {
    width: 100%;
    margin-top: var(--s-basic-spacing);
    position: relative;
    text-align: center;
    &--clickable {
      cursor: pointer;
      @include focus-outline($withOffset: true);
    }
    & + .formatted-amount--fiat-value {
      width: 100%;
      text-align: center;
      font-size: var(--s-font-size-medium);
      font-weight: 600;
    }
    .s-icon-chevron-down-rounded-16 {
      display: inline-block;
      margin-left: var(--s-basic-spacing);
      height: var(--s-icon-font-size-small);
      width: var(--s-icon-font-size-small);
      transition: transform 0.3s;
      background-color: var(--s-color-base-content-secondary);
      color: var(--s-color-base-on-accent);
      border-radius: 50%;
      text-align: left;
    }
    &--clicked .s-icon-chevron-down-rounded-16 {
      padding-right: #{$basic-spacing-small};
      transform: rotate(180deg);
    }
    &-info {
      width: 100%;
      margin-top: #{$basic-spacing-medium};
      .balance {
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: $basic-spacing-mini;
        border-bottom: 1px solid var(--s-color-base-border-secondary);
        font-size: var(--s-font-size-extra-small);
        &-label {
          text-transform: uppercase;
          margin-right: var(--s-basic-spacing);
          font-weight: 300;
          white-space: nowrap;
          &--total {
            font-weight: 600;
          }
        }
      }
    }
  }
  &-actions {
    margin-top: #{$basic-spacing-medium};

    & > *:not(:first-child) {
      margin-left: $basic-spacing;
    }
  }
}

.info-line-container {
  @include fadeHeight;
}
</style>

<style lang="scss">
.external-link {
  .info-line-value {
    cursor: pointer;
  }
}
</style>
