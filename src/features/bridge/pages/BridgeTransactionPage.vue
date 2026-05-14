<template>
  <div class="container transaction-container">
    <generic-page-header has-button-back :title="t('bridgeTransaction.title')" @back="handleBack">
      <s-button
        class="el-button--history"
        type="action"
        icon="time-time-history-24"
        :tooltip="t('bridgeHistory.showHistory')"
        :aria-label="t('bridgeHistory.showHistory')"
        tooltip-placement="bottom-end"
        @click="handleViewTransactionsHistory"
      ></s-button>
    </generic-page-header>

    <div class="transaction-content">
      <div class="header">
        <div v-loading="isTxPending" :class="headerIconClasses"></div>
        <h5 class="header-details">
          <formatted-amount
            class="info-line-value"
            value-can-be-hidden
            :value="formattedAmount"
            :asset-symbol="assetSymbol"
          >
            <i :class="`network-icon network-icon--${getNetworkIcon(isOutgoing ? 0 : externalNetworkId)}`"></i>
          </formatted-amount>
          <span class="header-details-separator">{{ t('bridgeTransaction.for') }}</span>
          <formatted-amount
            class="info-line-value"
            value-can-be-hidden
            :value="formattedAmountReceived"
            :asset-symbol="assetSymbol"
          >
            <i :class="`network-icon network-icon--${getNetworkIcon(isOutgoing ? externalNetworkId : 0)}`"></i>
          </formatted-amount>
        </h5>
      </div>

      <div
        v-for="{ value, formatted, placeholder, tooltip, links } in accountLinks"
        class="transaction-hash-container transaction-hash-container--with-dropdown"
        :key="value"
      >
        <s-input :placeholder="placeholder" :value="formatted" readonly></s-input>
        <s-button
          class="s-button--hash-copy"
          type="action"
          alternative
          icon="basic-copy-24"
          :tooltip="tooltip"
          :aria-label="tooltip"
          @click="handleCopyAddress(value, $event)"
        ></s-button>
        <links-dropdown v-if="links.length" :links="links"></links-dropdown>
      </div>

      <info-line
        :class="failedClass"
        :label="t('bridgeTransaction.networkInfo.status')"
        :value="transactionStatus"
      ></info-line>
      <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="txDate"></info-line>
      <info-line
        v-if="amount"
        is-formatted
        value-can-be-hidden
        :label="t('bridgeTransaction.networkInfo.amount')"
        :value="formattedAmount"
        :asset-symbol="assetSymbol"
        :fiat-value="amountFiatValue"
      ></info-line>
      <info-line
        v-if="amountReceived"
        is-formatted
        value-can-be-hidden
        :label="t('receivedText')"
        :value="formattedAmountReceived"
        :asset-symbol="assetSymbol"
        :fiat-value="amountReceivedFiatValue"
      ></info-line>
      <info-line
        is-formatted
        :label="getNetworkText(t('bridgeTransaction.networkInfo.transactionFee'))"
        :value="txSoraNetworkFeeFormatted"
        :asset-symbol="KnownSymbols.XOR"
        :fiat-value="txSoraNetworkFeeFiatValue"
      ></info-line>
      <info-line
        is-formatted
        :label="
          getNetworkText(
            t('bridgeTransaction.networkInfo.transactionFee'),
            externalNetworkId,
            txExternalNetworkFeeApproximation
          )
        "
        :value="txExternalNetworkFeeFormatted"
        :asset-symbol="nativeTokenSymbol"
        :fiat-value="txExternalNetworkFeeFiatValue"
      ></info-line>
      <info-line
        v-if="txExternalTransferFeeNotZero"
        is-formatted
        :label="t('bridge.externalTransferFee', { network: externalNetworkName })"
        :value="txExternalTransferFeeFormatted"
        :asset-symbol="assetSymbol"
        :fiat-value="txExternalTransferFeeFiatValue"
      ></info-line>

      <div
        v-for="{ value, formatted, placeholder, tooltip, links } in transactionLinks"
        class="transaction-hash-container transaction-hash-container--with-dropdown"
        :key="value"
      >
        <s-input :placeholder="placeholder" :value="formatted" readonly></s-input>
        <s-button
          class="s-button--hash-copy"
          type="action"
          alternative
          icon="basic-copy-24"
          :tooltip="tooltip"
          :aria-label="tooltip"
          @click="handleCopyAddress(value, $event)"
        ></s-button>
        <links-dropdown v-if="links.length" :links="links"></links-dropdown>
      </div>

      <template v-if="!txIsFinilized">
        <s-button v-if="isAnotherEvmAddress" type="primary" @click="connectEvmWallet">
          <template v-if="!externalAccount">
            {{ t('connectWalletText') }}
          </template>
          <template v-else>
            {{ t('changeAccountText') }}
          </template>
        </s-button>

        <s-button
          v-else
          type="primary"
          class="s-typograhy-button--big"
          :disabled="confirmationButtonDisabled"
          @click="handleTransaction"
        >
          <template v-if="confirmationBlocksLeft">
            {{ t('bridgeTransaction.blocksLeft', { count: confirmationBlocksLeft }) }}
          </template>
          <template v-else-if="txWaitingForApprove">{{
            t('bridgeTransaction.allowToken', { tokenSymbol: assetSymbol })
          }}</template>
          <template v-else-if="isTxPending">{{ t('bridgeTransaction.pending') }}</template>
          <template v-else-if="!(isOutgoing || isValidNetwork)">{{ t('changeNetworkText') }}</template>
          <template v-else-if="isInsufficientBalance">{{
            t('insufficientBalanceText', { tokenSymbol: assetSymbol })
          }}</template>
          <template v-else-if="isInsufficientXorForFee">{{
            t('insufficientBalanceText', { tokenSymbol: KnownSymbols.XOR })
          }}</template>
          <template v-else-if="isInsufficientEvmNativeTokenForFee">{{
            t('insufficientBalanceText', { tokenSymbol: nativeTokenSymbol })
          }}</template>
          <template v-else-if="isGreaterThanMaxAmount">
            {{ t('exceededAmountText', { amount: t('maxAmountText') }) }}
          </template>
          <template v-else-if="isLowerThanMinAmount">
            {{ t('exceededAmountText', { amount: t('minAmountText') }) }}
          </template>
          <template v-else-if="isTxWaiting">{{ t('confirmTransactionText') }}</template>
          <template v-else-if="hasRetry">{{ t('retryText') }}</template>
        </s-button>

        <div v-if="txWaitingForApprove" class="transaction-approval-text">
          {{ t('bridgeTransaction.approveToken') }}
        </div>
      </template>
    </div>
    <s-button v-if="txIsFinilized" class="s-typography-button--large" type="secondary" @click="navigateToBridge">
      {{ t('bridgeTransaction.newTransaction') }}
    </s-button>
  </div>
</template>

<script lang="ts" setup>
import { KnownSymbols as KnownSymbolsEnum } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import { useBridgeCore } from '@/composables/useBridgeCore';
import { useBridgeTransaction } from '@/composables/useBridgeTransaction';
import { useCopyAddress } from '@/composables/useCopyAddress';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { type ExplorerLink, PageNames, ZeroStringValue } from '@/consts';
import { resolveBridgeBackLocation } from '@/features/bridge/services/navigationHistory';
import { useBridgeStore } from '@/stores/bridge';
import {
  formatAddress,
  hasInsufficientBalance,
  hasInsufficientNativeTokenForFee,
  hasInsufficientXorForFee,
} from '@/utils';
import { isUnsignedTx } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { CodecString, IBridgeTransaction } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SubHistory, SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { Nullable } from '@/types/common';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';
import ConfirmBridgeTransactionDialog from '@/components/shared/Dialog/ConfirmBridgeTransaction.vue';
import GenericPageHeader from '@/components/shared/GenericPageHeader.vue';
import LinksDropdown from '@/components/shared/LinksDropdown.vue';

const FORMATTED_HASH_LENGTH = 24;
const KnownSymbols = KnownSymbolsEnum;

type LinkData = {
  value: string;
  formatted: string;
  placeholder: string;
  tooltip: string;
  links: Array<ExplorerLink>;
};

defineOptions({
  name: 'BridgeTransactionPage',
  inheritAttrs: false,
});

const FormattedAmount = WalletComponentFormattedAmount;
const InfoLine = WalletComponentInfoLine;

const { t, tc } = useTranslation();
const { handleCopyAddress, copyTooltip } = useCopyAddress();
const { formatStringValue, formatCodecNumber, getFiatAmountByString, getFiatAmountByCodecString } =
  useFormattedAmount();
const { withParentLoading } = useLoading();
const router = useRouter();
const { connectEvmWallet } = useWeb3Connection();
const bridgeStore = useBridgeStore();
const { waitingForApprove, inProgressIds, historyInternal } = storeToRefs(bridgeStore);
const bridgeCore = useBridgeCore();
const {
  handleViewTransactionsHistory,
  navigateToBridge,
  asset,
  nativeToken,
  nativeTokenSymbol,
  nativeTokenDecimals,
  isValidNetwork,
  externalNativeBalance,
  isNativeTokenSelected,
  xor,
  externalNetworkFee,
  soraNetworkFee,
} = bridgeCore;

const historyId = computed(() => bridgeStore.history.id);
const tx = computed(() => {
  const id = historyId.value;
  if (!id) return null;
  return (historyInternal.value as Record<string, IBridgeTransaction>)[id] ?? null;
});
const bridgeTransaction = useBridgeTransaction(tx);
const getNetworkIcon = bridgeTransaction.formatter.getNetworkIcon;
const getNetworkText = bridgeTransaction.getNetworkText;
const isOutgoing = bridgeTransaction.isOutgoing;
const externalNetworkId = bridgeTransaction.externalNetworkId;

const externalBlockNumber = computed(() => bridgeStore.fees.externalBlockNumber);
const externalAccount = bridgeTransaction.txExternalAccount;

const txIsUnsigned = computed(() => (tx.value?.id ? isUnsignedTx(tx.value) : false));
const txInProcess = computed(() => {
  const id = tx.value?.id;
  if (!id) return false;
  return Boolean(inProgressIds.value[id]);
});
const txWaitingForApprove = computed(() => {
  const id = tx.value?.id;
  if (!id) return false;
  return Boolean(waitingForApprove.value[id]);
});

const amount = computed(() => tx.value?.amount ?? '');
const amountReceived = computed(() => tx.value?.amount2 ?? amount.value);

const amountFiatValue = computed(() => (asset.value ? getFiatAmountByString(amount.value, asset.value) : null));
const amountReceivedFiatValue = computed(() =>
  asset.value ? getFiatAmountByString(amountReceived.value, asset.value) : null
);

const formattedAmount = computed(() =>
  amount.value && asset.value ? formatStringValue(amount.value, asset.value.decimals) : ''
);
const formattedAmountReceived = computed(() =>
  amountReceived.value && asset.value ? formatStringValue(amountReceived.value, asset.value.decimals) : ''
);

const assetSymbol = computed(() => asset.value?.symbol ?? '');

const parachainNetworkId = computed<Nullable<SubNetwork>>(() => {
  const networkId = bridgeTransaction.externalNetworkId.value as SubNetwork | null;
  if (!networkId) return null;
  try {
    return subBridgeApi.getSoraParachain(networkId);
  } catch {
    return null;
  }
});

const txSoraNetworkFee = computed<CodecString>(() => tx.value?.soraNetworkFee ?? soraNetworkFee.value);
const txSoraNetworkFeeFormatted = computed(() => formatCodecNumber(txSoraNetworkFee.value, xor.value?.decimals));
const txSoraNetworkFeeFiatValue = computed(() => getFiatAmountByCodecString(txSoraNetworkFee.value));

const txExternalNetworkFee = computed<CodecString>(() => tx.value?.externalNetworkFee ?? externalNetworkFee.value);
const txExternalNetworkFeeFormatted = computed(() =>
  formatCodecNumber(txExternalNetworkFee.value, nativeTokenDecimals.value)
);
const txExternalNetworkFeeApproximation = computed(() => {
  if (txExternalNetworkFeeFormatted.value === ZeroStringValue) return false;
  return !tx.value?.externalNetworkFee;
});
const txExternalNetworkFeeFiatValue = computed(() =>
  nativeToken.value ? getFiatAmountByCodecString(txExternalNetworkFee.value, nativeToken.value) : null
);

const txExternalTransferFee = computed<CodecString>(
  () => (tx.value as SubHistory | null)?.externalTransferFee ?? ZeroStringValue
);
const txExternalTransferFeeFormatted = computed(() =>
  formatCodecNumber(txExternalTransferFee.value, asset.value?.externalDecimals)
);
const txExternalTransferFeeNotZero = computed(() => txExternalTransferFee.value !== ZeroStringValue);
const txExternalTransferFeeFiatValue = computed(() =>
  asset.value ? getFiatAmountByCodecString(txExternalTransferFee.value, asset.value) : null
);

const txParachainBlockId = computed(() => (tx.value as SubHistory | null)?.parachainBlockId ?? '');
const txParachainBlockNumber = computed(() => (tx.value as SubHistory | null)?.parachainBlockHeight);

const txDate = computed(() => bridgeTransaction.formatter.formatDatetime(tx.value));
const txState = computed(() => tx.value?.transactionState ?? BridgeTxStatus.Pending);

const isTxFailed = computed(() => bridgeTransaction.formatter.isFailedState(tx.value));
const isTxCompleted = computed(() => bridgeTransaction.formatter.isSuccessState(tx.value));
const isTxWaiting = computed(() => bridgeTransaction.formatter.isWaitingForActionState(tx.value));
const isTxPending = computed(() => !isTxFailed.value && !isTxCompleted.value);
const hasRetry = computed(() => isTxFailed.value && (txIsUnsigned.value || bridgeTransaction.isEvmTxType.value));
const txIsFinilized = computed(() => !isTxPending.value && !isTxWaiting.value && !hasRetry.value);

const headerIconClasses = computed(() => {
  const iconClass = 'header-icon';
  const classes = [iconClass];

  if (isTxWaiting.value) {
    classes.push(`${iconClass}--wait`);
  } else if (isTxFailed.value) {
    classes.push(`${iconClass}--error`);
  } else if (isTxCompleted.value) {
    classes.push(`${iconClass}--success`);
  } else {
    classes.push(`${iconClass}--wait`);
  }

  return classes.join(' ');
});

const transactionStatus = computed(() => {
  if (txIsUnsigned.value || isTxWaiting.value) {
    return t('bridgeTransaction.statuses.waitingForConfirmation');
  }
  if (isTxFailed.value) {
    return t('bridgeTransaction.statuses.failed');
  }
  if (isTxCompleted.value) {
    return t('bridgeTransaction.statuses.done');
  }

  return `${t('bridgeTransaction.statuses.pending')}...`;
});

const isGreaterThanMaxAmount = computed(
  () =>
    txIsUnsigned.value &&
    bridgeCore.isGreaterThanTransferMaxAmount(amount.value, asset.value, bridgeTransaction.isOutgoing.value)
);

const isLowerThanMinAmount = computed(
  () =>
    txIsUnsigned.value &&
    bridgeCore.isLowerThanTransferMinAmount(amount.value, asset.value, bridgeTransaction.isOutgoing.value)
);

const isInsufficientBalance = computed(() => {
  const fee = bridgeTransaction.isOutgoing.value ? txSoraNetworkFee.value : txExternalNetworkFee.value;
  if (!asset.value || !amount.value || !fee) return false;

  return (
    txIsUnsigned.value &&
    hasInsufficientBalance(asset.value, amount.value, fee, {
      isExternalBalance: !bridgeTransaction.isOutgoing.value,
      isExternalNative: isNativeTokenSelected.value,
    })
  );
});

const isInsufficientXorForFee = computed(
  () => txIsUnsigned.value && hasInsufficientXorForFee(xor.value, txSoraNetworkFee.value)
);

const isInsufficientEvmNativeTokenForFee = computed(() => {
  const outgoing = bridgeTransaction.isOutgoing.value;
  return (
    ((txIsUnsigned.value && !outgoing) || (!txIsUnsigned.value && outgoing)) &&
    hasInsufficientNativeTokenForFee(externalNativeBalance.value, txExternalNetworkFee.value)
  );
});

const txExternalAccount = computed(() => bridgeTransaction.txExternalAccount.value ?? '');

const isAnotherEvmAddress = computed(() => {
  if (!bridgeTransaction.isEvmTxType.value) return false;
  if (!txExternalAccount.value || !externalAccount.value) return false;
  return txExternalAccount.value.toLowerCase() !== externalAccount.value.toLowerCase();
});

const confirmationButtonDisabled = computed(
  () =>
    !(bridgeTransaction.isOutgoing.value || isValidNetwork.value) ||
    isAnotherEvmAddress.value ||
    isInsufficientBalance.value ||
    isGreaterThanMaxAmount.value ||
    isLowerThanMinAmount.value ||
    isInsufficientXorForFee.value ||
    isInsufficientEvmNativeTokenForFee.value ||
    isTxPending.value
);

const externalNetworkName = computed(() => {
  const type = bridgeTransaction.externalNetworkType.value;
  const id = bridgeTransaction.externalNetworkId.value;
  if (!(type && id)) return '';
  return bridgeTransaction.formatter.getNetworkName(type, id);
});

const parachainExplorerLinks = computed(() => {
  const type = bridgeTransaction.externalNetworkType.value;
  const networkId = parachainNetworkId.value;
  if (!(type && networkId)) return [];

  return bridgeTransaction.formatter.getNetworkExplorerLinks(type, networkId, '', txParachainBlockNumber.value);
});

const confirmationBlocksLeft = computed(() => {
  if (
    !(
      bridgeTransaction.isEvmTxType.value &&
      !bridgeTransaction.isOutgoing.value &&
      bridgeTransaction.txExternalBlockNumber.value &&
      externalBlockNumber.value
    )
  ) {
    return 0;
  }

  const blocksLeft = (bridgeTransaction.txExternalBlockNumber.value ?? 0) + 30 - externalBlockNumber.value;

  return Math.max(blocksLeft, 0);
});

const failedClass = computed(() => (isTxFailed.value && !isTxWaiting.value ? 'info-line--error' : ''));

const txInternalHash = computed(() => {
  if (!bridgeTransaction.isOutgoing.value) return bridgeTransaction.txSoraHash.value;
  return (
    bridgeTransaction.txSoraHash.value || bridgeTransaction.txInternalBlockId.value || bridgeTransaction.txSoraId.value
  );
});

const parachainLinks = computed(() => parachainExplorerLinks.value);

const accountLinks = computed(() => {
  const name = t('accountAddressText');
  const internal = getLinkData(
    bridgeTransaction.txInternalAccount.value,
    bridgeTransaction.internalAccountLinks.value,
    name
  );
  const external = getLinkData(
    bridgeTransaction.txExternalAccount.value,
    bridgeTransaction.externalAccountLinks.value,
    name,
    bridgeTransaction.externalNetworkId.value
  );

  return sortLinksByTxDirection([internal, external]);
});

const transactionLinks = computed(() => {
  const txHashName = t('bridgeTransaction.transactionHash');
  const txBlockName = t('transaction.blockId');
  const internal = getLinkData(txInternalHash.value, bridgeTransaction.internalExplorerLinks.value, txHashName);
  const parachain = getLinkData(txParachainBlockId.value, parachainLinks.value, txBlockName, parachainNetworkId.value);
  const external = getLinkData(
    bridgeTransaction.txExternalHash.value ?? bridgeTransaction.txExternalBlockId.value,
    bridgeTransaction.externalExplorerLinks.value,
    bridgeTransaction.txExternalHash.value ? txHashName : txBlockName,
    bridgeTransaction.externalNetworkId.value
  );

  return sortLinksByTxDirection([internal, parachain, external]);
});

function sortLinksByTxDirection(outgoingOrderedLinks: Array<LinkData | null>): LinkData[] {
  const links = outgoingOrderedLinks.filter(Boolean) as LinkData[];
  return bridgeTransaction.isOutgoing.value ? links : [...links].reverse();
}

function getLinkData(
  value: string,
  links: Array<ExplorerLink>,
  name: string,
  networkId?: Nullable<BridgeNetworkId>
): LinkData | null {
  if (!value) return null;

  const placeholder = bridgeTransaction.getNetworkText(name, networkId);

  return {
    value,
    formatted: formatAddress(value, FORMATTED_HASH_LENGTH),
    placeholder,
    tooltip: copyTooltip(placeholder),
    links,
  };
}

async function handleTransaction(withAutoStart = true): Promise<void> {
  if (withAutoStart && tx.value?.id) {
    await bridgeStore.handleBridgeTransaction(tx.value.id);
  }
}

function handleBack(): void {
  const backLocation = resolveBridgeBackLocation();
  if (backLocation) {
    router.push(backLocation);
    return;
  }

  navigateToBridge();
}

const txLink = computed(() => {
  const link = bridgeTransaction.isOutgoing.value
    ? bridgeTransaction.externalExplorerLinks.value[0]
    : bridgeTransaction.internalExplorerLinks.value[0];
  const network = bridgeTransaction.isOutgoing.value ? bridgeTransaction.externalNetworkId.value : undefined;

  return prepareLink(link, network);
});

const txAccountLink = computed(() => {
  const link = bridgeTransaction.isOutgoing.value
    ? bridgeTransaction.externalAccountLinks.value[0]
    : bridgeTransaction.internalAccountLinks.value[0];
  const network = bridgeTransaction.isOutgoing.value ? bridgeTransaction.externalNetworkId.value : undefined;

  return prepareLink(link, network, false);
});

function prepareLink(
  link: ExplorerLink | undefined,
  externalNetworkId?: Nullable<BridgeNetworkId>,
  isTxLink = true
): { href: string; title: string } | null {
  if (!link) return null;
  const linkText = isTxLink ? tc('transactionText', 1) : tc('accountText', 1);

  return {
    href: link.value,
    title: bridgeTransaction.getNetworkText(linkText, externalNetworkId),
  };
}

onMounted(async () => {
  if (!tx.value) {
    navigateToBridge();
    return;
  }

  await withParentLoading(async () => {
    const withAutoStart = !txInProcess.value && isTxPending.value;
    await handleTransaction(withAutoStart);
  });
});

onBeforeUnmount(async () => {
  if (!tx.value) return;

  if (!txInProcess.value && txIsUnsigned.value) {
    const historyCopy = { ...tx.value };
    await bridgeStore.removeHistory({ tx: historyCopy, force: true });
  }

  bridgeStore.setHistoryId();
});
</script>

<style lang="scss">
$header-icon-size: 52px;
$header-spinner-size: 62px;
$header-font-size: var(--s-heading3-font-size);

.transaction {
  &-container {
    @include bridge-container;
  }
  &-content {
    @include collapse-items;
    .header {
      &-details .info-line-value {
        .formatted-amount {
          &__integer,
          &__symbol {
            font-size: $header-font-size;
          }
          &__decimal {
            font-size: calc(#{$header-font-size} * 0.75) !important;
          }
        }
      }
      &-icon {
        position: relative;
        @include svg-icon('', $header-icon-size);
        .el-loading-mask {
          background-color: var(--s-color-utility-surface);
        }
        .el-loading-spinner {
          top: 0;
          margin-top: calc(#{$header-icon-size - $header-spinner-size} / 2);
          .circular {
            width: $header-spinner-size;
            height: $header-spinner-size;
          }
        }
      }
    }
    .el-button .network-title {
      text-transform: uppercase;
    }
    .info-line {
      &--error .info-line-value {
        color: var(--s-color-status-error);
        font-weight: 600;
        text-transform: uppercase;
      }
      &-label {
        font-weight: 300;
      }
    }
  }
  &-hash-container {
    .s-button--hash-copy {
      padding: 0;
      color: var(--s-color-base-content-tertiary) !important;
      .s-icon-copy {
        margin-right: 0 !important;
      }
    }
    &--with-dropdown {
      .s-button--hash-copy {
        right: calc(#{$inner-spacing-medium} + var(--s-size-mini));
      }
      .s-dropdown--hash-menu {
        position: absolute;
        z-index: $app-content-layer;
        top: 0;
        bottom: 0;
        right: $inner-spacing-medium;
      }
    }
    i {
      font-weight: 600;
      @include icon-styles;
    }
  }
}
.s-button--hash-copy {
  right: $inner-spacing-medium;
  &,
  .el-tooltip {
    &:focus {
      outline: auto;
    }
  }
}
[design-system-theme='dark'] {
  .transaction-content .s-input {
    background-color: var(--s-color-base-on-accent);
  }
}
</style>

<style lang="scss" scoped>
$network-title-max-width: 250px;

.transaction {
  &-container {
    flex-direction: column;
    align-items: center;
    margin-top: $inner-spacing-large;
    margin-right: auto;
    margin-left: auto;
    &.el-loading-parent--relative .transaction-content {
      min-height: $bridge-height;
    }
  }
  &-content .el-button,
  &-container .s-typography-button--large {
    width: 100%;
    margin-top: $inner-spacing-medium;
  }
  &-content {
    @include bridge-content(285px);
    margin-top: $inner-spacing-big;

    & > *:not(:first-child) {
      margin-top: $inner-spacing-medium;
    }
  }

  &-hash-container {
    position: relative;

    .s-button--hash-copy {
      position: absolute;
      z-index: $app-content-layer;
      top: 0;
      bottom: 0;
      margin-top: auto;
      margin-bottom: auto;
      padding: 0;
      width: var(--s-size-mini);
      height: var(--s-size-mini);
      line-height: 1;
    }
  }
  &-error {
    color: var(--s-color-status-error);
    display: flex;
    flex-flow: column nowrap;
    padding: 0 $inner-spacing-tiny;
    margin-bottom: $inner-spacing-medium;
    line-height: var(--s-line-height-mini);
    text-align: left;

    &__title {
      margin-bottom: $inner-spacing-tiny;
      text-transform: uppercase;
      font-weight: 300;
    }
    &__value {
      font-weight: 400;
    }
  }
  &-approval-text {
    margin-top: $inner-spacing-medium;
    font-size: var(--s-font-size-mini);
  }
}
.header {
  margin-bottom: $inner-spacing-medium;
  text-align: center;
  &-icon {
    margin: $inner-spacing-medium auto;
    &--success {
      background-image: url('@/assets/img/status-success.svg');
      background-size: 110%;
    }
    &--wait {
      background-image: url('@/assets/img/header-wait.svg');
    }
    &--error {
      background-image: url('@/assets/img/header-error.svg');
      background-size: 125%;
    }
    &.el-loading-parent--relative {
      background-image: none;
    }
  }
  &-details {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: $inner-spacing-mini;
    font-weight: 700;
    line-height: var(--s-line-height-medium);
    .network-icon {
      margin-left: calc(#{$inner-spacing-mini} / 4);
    }
    &-separator {
      margin-right: $inner-spacing-tiny;
      margin-left: $inner-spacing-tiny;
      font-size: var(--s-heading3-font-size);
      font-weight: 300;
    }
  }
}
</style>
