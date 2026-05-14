<template>
  <wallet-base :title="headerTitle" show-back :reset-focus="hasResetFocus" @back="handleBack">
    <template v-if="!selectedTransaction" #actions>
      <s-button
        v-if="!isXor"
        type="action"
        :tooltip="t('asset.remove')"
        :aria-label="t('asset.remove')"
        @click="handleRemoveAsset"
      >
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
              :aria-label="getOperationTooltip(operation)"
              @click="handleOperation(operation.type)"
            >
              <s-icon :name="operation.icon" size="24"></s-icon>
            </s-button>

            <qr-code-scan-button primary size="medium" @change="parseQrCodeValue"></qr-code-scan-button>

            <s-button
              type="action"
              primary
              rounded
              :tooltip="t('code.receive')"
              :aria-label="t('code.receive')"
              @click="receiveByQrCode(asset)"
            >
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
import { computed, onMounted, ref } from 'vue';

import { getWalletCurrentParams, type WalletNavigationTarget } from '@/platform/wallet/navigation';
import { useCopyAddress } from '../composables/useCopyAddress';
import { useFormattedAmount } from '../composables/useFormattedAmount';
import { useOperations } from '../composables/useOperations';
import { useQrCodeParser } from '../composables/useQrCodeParser';
import { api } from '../api';
import { useWalletStore } from '@/stores/wallet';

import { RouteNames } from '../consts';
import { Operations } from '../types/common';
import { copyToClipboard, delay, shortenValue } from '../util';
import { IpfsStorage } from '../util/ipfsStorage';

import FormattedAmount from './FormattedAmount.vue';
import FormattedAmountWithFiatValue from './FormattedAmountWithFiatValue.vue';
import InfoLine from './InfoLine.vue';
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

export default {
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
  emits: Object.values(Operations),
  setup(_props, { emit }) {
    const walletStore = useWalletStore();
    const { t, getTitle } = useOperations();
    const { getAssetFiatPrice, formatCodecNumber, isCodecZero, getFiatBalance, FontSizeRate, FontWeightRate } =
      useFormattedAmount();
    const { parseQrCodeValue, receiveByQrCode } = useQrCodeParser();

    const balanceTypes = [
      BalanceType.Transferable,
      BalanceType.Locked,
      [BalanceType.Frozen, BalanceType.Reserved, BalanceType.Bonded],
      BalanceType.Total,
    ];
    const wasBalanceDetailsClicked = ref(false);
    const wasNftLinkCopied = ref(false);
    const wasNftDetailsClicked = ref(false);
    const nftContentLink = ref('');

    const permissions = computed(() => walletStore.permissions);
    const accountAssets = computed(() => walletStore.accountAssets);
    const history = computed(() => walletStore.history);
    const selectedTransaction = computed(() => walletStore.selectedTransaction);
    const currentRouteParams = computed<Record<string, AccountAsset>>(() => {
      return getWalletCurrentParams<Record<string, AccountAsset>>();
    });
    const asset = computed<AccountAsset>(() => {
      return (
        accountAssets.value.find(({ address }) => address === currentRouteParams.value.asset.address) ||
        currentRouteParams.value.asset
      );
    });
    const hasResetFocus = computed(() =>
      selectedTransaction.value && selectedTransaction.value.id
        ? selectedTransaction.value.id.toString()
        : wasBalanceDetailsClicked.value.toString()
    );
    const isNft = computed(() => api.assets.isNft(asset.value));
    const headerTitle = computed(() => {
      if (!selectedTransaction.value) return asset.value.name;

      return getTitle(selectedTransaction.value as HistoryItem);
    });
    const nftLinkTooltipText = computed(() =>
      wasNftLinkCopied.value ? t('copiedText') : t('createToken.nft.link.copyLink')
    );
    const displayedNftContentLink = computed(() => {
      const hostname = IpfsStorage.getStorageHostname(nftContentLink.value);
      const path = IpfsStorage.getIpfsPath(nftContentLink.value);
      return shortenValue(hostname + '/ipfs/' + path, 25);
    });
    const operations = computed<Array<Operation>>(() => {
      const list: Array<Operation> = [];
      const divisible = !!asset.value.decimals;

      if ((permissions.value as WalletPermissions).sendAssets) {
        list.push({ type: Operations.Send, icon: 'finance-send-24' });
      }
      if ((permissions.value as WalletPermissions).swapAssets && divisible) {
        list.push({ type: Operations.Swap, icon: 'arrows-swap-24' });
      }
      if ((permissions.value as WalletPermissions).addLiquidity && divisible) {
        list.push({ type: Operations.Liquidity, icon: 'basic-drop-24' });
      }
      if ((permissions.value as WalletPermissions).bridgeAssets && divisible) {
        list.push({ type: Operations.Bridge, icon: 'grid-block-distribute-vertically-24' });
      }

      return list;
    });
    const price = computed<Nullable<CodecString>>(() => getAssetFiatPrice(asset.value));
    const balance = computed(() => formatCodecNumber(asset.value.balance.transferable, asset.value.decimals));
    const isEmptyBalance = computed(() => isCodecZero(asset.value.balance.transferable, asset.value.decimals));
    const balanceStyles = computed(() => {
      const balanceLength = balance.value.length;
      let fontSize = 30;
      if (balanceLength > 35) {
        fontSize = 14;
      } else if (balanceLength > 24 && balanceLength <= 35) {
        fontSize = 16;
      } else if (balanceLength > 17 && balanceLength <= 24) {
        fontSize = 20;
      }
      return { fontSize: `${fontSize}px` };
    });
    const isXor = computed(() => asset.value.address === XOR.address);
    const balanceDetailsClasses = computed<Array<string>>(() => {
      const cssClasses: Array<string> = ['asset-details-balance', 'd2'];
      if (isXor.value) {
        cssClasses.push('asset-details-balance--clickable');
      }
      if (wasBalanceDetailsClicked.value) {
        cssClasses.push('asset-details-balance--clicked');
      }
      return cssClasses;
    });

    const resetTxDetailsId = (): void => {
      walletStore.resetTxDetailsId();
    };

    const navigate = (options: WalletNavigationTarget): void => {
      walletStore.navigate(options);
    };

    const setNftMeta = async (): Promise<void> => {
      const ipfsPath = asset.value.content as string;
      nftContentLink.value = IpfsStorage.constructFullIpfsUrl(ipfsPath);
    };

    const handleClickNftDetails = (): void => {
      wasNftDetailsClicked.value = !wasNftDetailsClicked.value;
    };

    const handleCopyNftLink = async (): Promise<void> => {
      await copyToClipboard(nftContentLink.value);
      wasNftLinkCopied.value = true;
      await delay(1000);
      wasNftLinkCopied.value = false;
    };

    const formatBalance = (value: CodecString): string => formatCodecNumber(value, asset.value.decimals);

    const handleBack = (): void => {
      if (selectedTransaction.value) {
        resetTxDetailsId();
      } else {
        navigate({ name: RouteNames.Wallet });
      }
    };

    const getOperationTooltip = (operation: Operation): string => t(`assets.${operation.type}`);
    const isOperationDisabled = (operation: Operations): boolean =>
      operation === Operations.Send && isEmptyBalance.value;
    const handleOperation = (operation: Operations): void => {
      switch (operation) {
        case Operations.Send:
          navigate({ name: RouteNames.WalletSend, params: { asset: asset.value } });
          break;
        default:
          emit(operation, asset.value);
          break;
      }
    };
    const handleClickDetailedBalance = (): void => {
      wasBalanceDetailsClicked.value = !wasBalanceDetailsClicked.value;
    };
    const handleRemoveAsset = (): void => {
      api.assets.removeAccountAsset(asset.value.address);
      handleBack();
    };

    onMounted(() => {
      if (isNft.value) {
        void setNftMeta();
      }
    });

    return {
      t,
      FontSizeRate,
      FontWeightRate,
      balanceTypes,
      wasBalanceDetailsClicked,
      wasNftDetailsClicked,
      hasResetFocus,
      selectedTransaction,
      isXor,
      isNft,
      nftContentLink,
      headerTitle,
      nftLinkTooltipText,
      displayedNftContentLink,
      operations,
      price,
      asset,
      balance,
      balanceStyles,
      balanceDetailsClasses,
      handleClickDetailedBalance,
      getFiatBalance,
      getOperationTooltip,
      isOperationDisabled,
      handleOperation,
      parseQrCodeValue,
      receiveByQrCode,
      handleClickNftDetails,
      handleCopyNftLink,
      formatBalance,
      handleBack,
      handleRemoveAsset,
    };
  },
};
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
