<template>
  <div class="bridge s-flex">
    <s-form class="bridge-form" :show-message="false">
      <s-card
        v-loading="parentLoading"
        class="bridge-content"
        border-radius="medium"
        shadow="always"
        size="big"
        primary
      >
        <generic-page-header class="header--bridge" :title="bridgeTitle" :tooltip="t('bridge.info')">
          <div class="bridge-header-buttons">
            <s-button
              v-if="isLoggedIn"
              class="history-button"
              type="action"
              icon="time-time-history-24"
              :tooltip="t('bridgeHistory.showHistory')"
              tooltip-placement="bottom-end"
              @click="handleViewTransactionsHistory"
            >
              <span v-if="hasWaitingForActionTx" class="history-button-icon"></span>
            </s-button>

            <bridge-network-selector></bridge-network-selector>
          </div>
        </generic-page-header>

        <token-input
          id="bridgeFrom"
          data-test-name="bridgeFrom"
          with-address
          :balance="firstBalance ? firstBalance.toCodecString() : null"
          :decimals="amountDecimals"
          :disabled="!(areAccountsConnected && isAssetSelected)"
          :external="!isSoraToEvm"
          :without-fiat="!isSoraToEvm && isDenominatedAsset"
          :is-max-available="isMaxAvailable"
          :is-select-available="!autoselectedAssetAddress"
          :loading="isConfirmTxLoading"
          :model-value="amountSend"
          :title="t('transfers.from')"
          :token="asset"
          @update:model-value="setSendedAmount"
          @focus="setFocusedField(FocusedField.Sended)"
          @max="handleMaxValue"
          @select="openSelectAssetDialog"
        >
          <template #title-append>
            <span class="input-title--network">{{ formatSelectedNetwork(isSoraToEvm) }}</span>
            <i :class="`network-icon network-icon--${getNetworkIcon(isSoraToEvm ? 0 : networkSelected)}`"></i>
            <bridge-node-icon
              v-if="isSubBridge && !isSoraToEvm"
              :connection="subConnection"
              @click="handleChangeSubNode"
            ></bridge-node-icon>
          </template>

          <bridge-account-panel
            data-test-name="connectPolkadot"
            :address="sender"
            :name="senderName"
            :tooltip="getCopyTooltip(isSoraToEvm)"
            :icon="getProviderIcon(isSoraToEvm)"
            @connect="connectWallet(isSoraToEvm)"
            @disconnect="disconnectWallet(isSoraToEvm)"
          ></bridge-account-panel>
        </token-input>

        <s-button
          class="s-button--switch"
          data-test-name="switchToken"
          type="action"
          icon="arrows-swap-90-24"
          :disabled="isConfirmTxLoading"
          @click="switchDirection"
        ></s-button>

        <token-input
          id="bridgeTo"
          data-test-name="bridgeTo"
          with-address
          :balance="secondBalance ? secondBalance.toCodecString() : null"
          :decimals="amountDecimals"
          :disabled="!(areAccountsConnected && isAssetSelected)"
          :external="isSoraToEvm"
          :without-fiat="isSoraToEvm && isDenominatedAsset"
          :loading="isConfirmTxLoading"
          :model-value="amountReceived"
          :title="t('transfers.to')"
          :token="asset"
          @update:model-value="setReceivedAmount"
          @focus="setFocusedField(FocusedField.Received)"
          @select="openSelectAssetDialog"
        >
          <template #title-append>
            <span class="input-title--network">{{ formatSelectedNetwork(!isSoraToEvm) }}</span>
            <i :class="`network-icon network-icon--${getNetworkIcon(!isSoraToEvm ? 0 : networkSelected)}`"></i>
            <bridge-node-icon
              v-if="isSubBridge && isSoraToEvm"
              :connection="subConnection"
              @click="handleChangeSubNode"
            ></bridge-node-icon>
          </template>

          <bridge-account-panel
            data-test-name="useMetamaskProvider"
            :address="recipient"
            :name="recipientName"
            :tooltip="getCopyTooltip(!isSoraToEvm)"
            :icon="getProviderIcon(!isSoraToEvm)"
            @connect="connectWallet(!isSoraToEvm)"
            @disconnect="disconnectWallet(!isSoraToEvm)"
          ></bridge-account-panel>
        </token-input>

        <s-button
          v-if="areAccountsConnected"
          class="el-button--next s-typography-button--large"
          data-test-name="nextButton"
          type="primary"
          :disabled="!areAccountsConnected || (isValidNetwork && isTxConfirmDisabled)"
          :loading="areAccountsConnected && isValidNetwork && isConfirmTxLoading"
          @click="handleNextButtonClick"
        >
          <template v-if="!isValidNetwork">
            {{ t('changeNetworkText') }}
          </template>
          <template v-else-if="!isAssetSelected">
            {{ t('buttons.chooseAToken') }}
          </template>
          <template v-else-if="!isRegisteredAsset">
            {{ t('bridge.notRegisteredAsset', { assetSymbol }) }}
          </template>
          <template v-else-if="isZeroAmountSend">
            {{ t('buttons.enterAmount') }}
          </template>
          <template v-else-if="isZeroAmountReceived">
            {{ t('swap.insufficientAmount', { tokenSymbol: assetSymbol }) }}
          </template>
          <template v-else-if="isInsufficientBalance">
            {{ t('insufficientBalanceText', { tokenSymbol: assetSymbol }) }}
          </template>
          <template v-else-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: KnownSymbols.XOR }) }}
          </template>
          <template v-else-if="isInsufficientNativeTokenForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: nativeTokenSymbol }) }}
          </template>
          <template v-else-if="isGreaterThanMaxAmount">
            {{ t('exceededAmountText', { amount: t('maxAmountText') }) }}
          </template>
          <template v-else-if="isLowerThanMinAmount">
            {{ t('exceededAmountText', { amount: t('minAmountText') }) }}
          </template>
          <template v-else>
            {{ t('bridge.next') }}
          </template>
        </s-button>

        <template v-if="areAccountsConnected && isValidNetwork">
          <bridge-limit-card
            v-if="isLowerThanMinAmount || isGreaterThanMaxAmount"
            class="bridge-limit-card"
            :max="isGreaterThanMaxAmount"
            :amount="limitCardAmount"
            :symbol="assetSymbol"
          ></bridge-limit-card>

          <bridge-transaction-details
            v-if="!isZeroAmountReceived && isRegisteredAsset"
            class="info-line-container"
            :asset="asset"
            :native-token="nativeToken"
            :external-transfer-fee="formattedExternalTransferFee"
            :external-network-fee="formattedExternalNetworkFee"
            :external-min-balance="formattedExternalMinBalance"
            :sora-network-fee="formattedSoraNetworkFee"
            :network-name="networkName"
          ></bridge-transaction-details>
        </template>
      </s-card>
    </s-form>

    <div v-if="!areAccountsConnected" class="bridge-footer">
      <div class="bridge-footer__callout">
        {{ t('bridge.connectWallets') }}
      </div>
    </div>

    <bridge-select-asset
      v-model:visible="showSelectTokenDialog"
      :asset="asset"
      @select="selectAsset"
    ></bridge-select-asset>
    <bridge-select-sub-account></bridge-select-sub-account>
    <app-browser-m-s-t-warning-bridge v-model:visible="showMSTWarning"></app-browser-m-s-t-warning-bridge>
    <select-node-dialog
      v-if="subConnection"
      :connection="subConnection"
      :network="selectedNetworkName"
      :visibility="selectSubNodeDialogVisibility"
      :set-visibility="setSelectSubNodeDialogVisibility"
    ></select-node-dialog>
    <confirm-bridge-transaction-dialog
      v-model:visible="confirmDialogVisible"
      :is-sora-to-evm="isSoraToEvm"
      :asset="asset"
      :amount-send="amountSend"
      :amount-received="amountReceived"
      :network="networkSelected"
      :network-type="networkType"
      :native-token="nativeToken"
      :external-transfer-fee="formattedExternalTransferFee"
      :external-network-fee="formattedExternalNetworkFee"
      :sora-network-fee="formattedSoraNetworkFee"
      @confirm="confirmTransaction"
    ></confirm-bridge-transaction-dialog>
    <network-fee-warning-dialog
      v-model:visible="showWarningFeeDialog"
      :fee="formatStringValue(formattedSoraNetworkFee)"
      @confirm="confirmNetworkFeeWariningDialog"
    ></network-fee-warning-dialog>
    <network-fee-warning-dialog
      v-model:visible="showWarningExternalFeeDialog"
      :fee="formatStringValue(formattedExternalNetworkFee)"
      :symbol="nativeTokenSymbol"
      :payoff="false"
      @confirm="confirmExternalNetworkFeeWarningDialog"
    ></network-fee-warning-dialog>
  </div>
</template>

<script setup lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { KnownSymbols as KnownSymbolsEnum } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@/shims/wallet-components';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Components, PageNames } from '@/consts';
import { BridgeFocusedField as FocusedFieldEnum } from '@/stores/bridge/types';
import { useTranslation } from '@/composables/useTranslation';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useBridgeCore } from '@/composables/useBridgeCore';
import { useNetworkFormatter } from '@/composables/useNetworkFormatter';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useNetworkFeeWarning } from '@/composables/useNetworkFeeWarning';
import { useNetworkFeeDialog } from '@/composables/useNetworkFeeDialog';
import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { useTokenSelect } from '@/composables/useTokenSelect';
import { useLoading } from '@/composables/useLoading';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeStore } from '@/stores/bridge';
import { useBridgeTransactionsStore } from '@/stores/bridge/transactions';
import { useWeb3Store } from '@/stores/web3';
import { useWalletStore } from '@/stores/wallet';
import {
  asZeroValue,
  delay,
  getAssetBalance,
  getMaxBalance,
  hasInsufficientBalance,
  hasInsufficientNativeTokenForFee,
  hasInsufficientXorForFee,
  isXorAccountAsset,
} from '@/utils';
import { isDenominatedAsset as isDenominatedAssetUtil } from '@/utils/bridge/common/utils';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import type { NodesConnection } from '@/utils/connection';
import type { Nullable } from '@/types/common';

defineOptions({
  components: {
    BridgeSelectAsset: lazyComponent(Components.BridgeSelectAsset),
    BridgeSelectSubAccount: lazyComponent(Components.BridgeSelectSubAccount),
    BridgeAccountPanel: lazyComponent(Components.BridgeAccountPanel),
    BridgeNodeIcon: lazyComponent(Components.BridgeNodeIcon),
    BridgeTransactionDetails: lazyComponent(Components.BridgeTransactionDetails),
    BridgeLimitCard: lazyComponent(Components.BridgeLimitCard),
    BridgeNetworkSelector: lazyComponent(Components.BridgeNetworkSelector),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenInput: lazyComponent(Components.TokenInput),
    AppBrowserMSTWarningBridge: lazyComponent(Components.AppBrowserMSTWarningBridge),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    InfoLine: components.InfoLine,
    TokenAddress: components.TokenAddress,
  },
});

const KnownSymbols = KnownSymbolsEnum;
const FocusedField = FocusedFieldEnum;

const route = useRoute();
const router = useRouter();

const { t } = useTranslation();
const { formatStringValue, getStringFromCodec, getFPNumber, getFPNumberFromCodec } = useFormattedAmount();
const bridgeTitle = computed(() => t('hashiBridgeText'));

const {
  asset,
  nativeToken,
  sender,
  recipient,
  xor,
  isSoraToEvm,
  isValidNetwork,
  externalNetworkFee,
  externalNativeBalance,
  assetExternalMinBalance,
  incomingMinLimit,
  outgoingMinLimit,
  outgoingMaxLimit,
  soraNetworkFee,
  externalTransferFee,
  nativeTokenSymbol,
  nativeTokenDecimals,
  isNativeTokenSelected,
  isSidechainAsset,
  getTransferMaxAmount,
  getTransferMinAmount,
  isGreaterThanTransferMaxAmount: isGreaterThanTransferMaxAmountFn,
  isLowerThanTransferMinAmount: isLowerThanTransferMinAmountFn,
  handleViewTransactionsHistory,
  navigateToBridge,
} = useBridgeCore();

const {
  formatSelectedNetwork,
  formatNetworkShortName,
  getNetworkIcon,
  selectedNetworkName: selectedNetworkNameComputed,
} = useNetworkFormatter();

const {
  evmProvider,
  evmProviderLoading,
  connectEvmWallet,
  disconnectEvmWallet,
  connectSubWallet,
  disconnectSubWallet,
  changeEvmNetworkProvided,
  getEvmProviderIcon,
} = useWeb3Connection();

const { connectSoraWallet, disconnectSoraWallet, isLoggedIn } = useInternalConnect();

const { allowFeePopup, accountAssetsAddressTable, isXorSufficientForNextTx } = useNetworkFeeWarning();

const {
  showWarningFeeDialog,
  isWarningFeeDialogConfirmed,
  openWarningFeeDialog,
  confirmNetworkFeeWariningDialog,
  waitOnFeeWarningConfirmation,
} = useNetworkFeeDialog();

const { confirmDialogVisible, confirmOrExecute } = useConfirmDialog();

const { isSelectAssetLoading, withSelectAssetLoading } = useTokenSelect();

const { loading: parentLoading, withLoading } = useLoading();
const assetsStore = useAssetsStore();
const walletStore = useWalletStore();
const bridgeStore = useBridgeStore();
const bridgeTransactionsStore = useBridgeTransactionsStore();
const web3Store = useWeb3Store();

const showSelectTokenDialog = ref(false);
const showMSTWarning = ref(false);
const showWarningExternalFeeDialog = ref(false);
const isWarningExternalFeeDialogConfirmed = ref(false);

const subBridgeConnector = computed(() => bridgeStore.connector as SubNetworksConnector);
const isSubBridge = computed(() => bridgeStore.isSubBridge);
const isSubAccountType = computed(() => bridgeStore.isSubAccountType);
const networkSelected = computed(() => web3Store.networkSelected);
const networkType = computed(() => web3Store.networkType);
const selectSubNodeDialogVisibility = computed(() => web3Store.selectSubNodeDialogVisibility);
const senderName = computed(() => bridgeStore.senderName);
const recipientName = computed(() => bridgeStore.recipientName);
const isRegisteredAsset = computed(() => bridgeStore.isRegisteredAsset);
const autoselectedAssetAddress = computed(() => bridgeStore.autoselectedAssetAddress);
const hasWaitingForActionTx = computed(() => bridgeStore.hasWaitingForActionTx);
const balancesFetching = computed(() => bridgeStore.flags.balancesFetching);
const feesAndLockedFundsFetching = computed(() => bridgeStore.flags.feesAndLockedFundsFetching);
const registeredAssetsFetching = computed(() => assetsStore.registeredAssetsFetching);
const amountSend = computed(() => bridgeStore.form.amountSend);
const amountReceived = computed(() => bridgeStore.form.amountReceived);
const isMST = computed(() => walletStore.isMstAccount);
const operation = computed(() => bridgeStore.operation);
const selectedNetworkName = computed(() => selectedNetworkNameComputed.value);
const accountAssetsAddressTableMap = computed(() => accountAssetsAddressTable.value ?? ({} as Record<string, unknown>));

const subConnection = computed<Nullable<NodesConnection>>(() => {
  if (!isSubBridge.value) return null;
  if (networkSelected.value !== subBridgeConnector.value.network?.subNetwork) return null;

  return subBridgeConnector.value.network?.subNetworkConnection ?? null;
});

const isExternalNetworkLoading = computed(() =>
  isSubBridge.value ? !subConnection.value?.nodeIsConnected : Boolean(evmProviderLoading.value)
);

const areAccountsConnected = computed(() => Boolean(sender.value && recipient.value));

const isDenominatedAsset = computed(() => isDenominatedAssetUtil(asset.value?.address ?? ''));

const networkName = computed(() => formatNetworkShortName(false));

const amountDecimals = computed(() => {
  const internal = asset.value?.decimals ?? FPNumber.DEFAULT_PRECISION;
  const external = asset.value?.externalDecimals ?? FPNumber.DEFAULT_PRECISION;

  return Math.min(internal, external);
});

const getBalance = (fromSora = true): Nullable<FPNumber> => {
  if (!(asset.value && (isRegisteredAsset.value || fromSora))) {
    return null;
  }

  const balance = getAssetBalance(asset.value, { internal: fromSora });
  if (!balance) {
    return null;
  }

  const decimals = fromSora ? asset.value.decimals : asset.value.externalDecimals;
  return getFPNumberFromCodec(balance, decimals);
};

const firstBalance = computed(() => (sender.value ? getBalance(isSoraToEvm.value) : null));
const secondBalance = computed(() => (recipient.value ? getBalance(!isSoraToEvm.value) : null));

const isZeroAmountSend = computed(() => asZeroValue(amountSend.value));
const isZeroAmountReceived = computed(() => asZeroValue(amountReceived.value));

const transferMaxAmount = computed(() => getTransferMaxAmount(isSoraToEvm.value));
const transferMinAmount = computed(() => getTransferMinAmount(isSoraToEvm.value));

const transferableAmount = computed(() => {
  if (!(asset.value && isRegisteredAsset.value && areAccountsConnected.value)) return FPNumber.ZERO;

  const fee = isSoraToEvm.value ? soraNetworkFee.value : externalNetworkFee.value;

  const minBalance = FPNumber.fromCodecValue(assetExternalMinBalance.value, asset.value.externalDecimals);
  const maxBalance = getMaxBalance(asset.value, fee, {
    isExternalBalance: !isSoraToEvm.value,
    isExternalNative: isNativeTokenSelected.value,
  });

  return maxBalance.sub(minBalance).max(FPNumber.ZERO);
});

const maxValue = computed(() => {
  let amount = transferableAmount.value;

  if (transferMaxAmount.value && FPNumber.gt(amount, transferMaxAmount.value)) {
    amount = transferMaxAmount.value;
  }

  return amount.dp(amountDecimals.value).toString();
});

const isMaxAvailable = computed(() => !asZeroValue(maxValue.value) && maxValue.value !== amountSend.value);

const isGreaterThanMaxAmount = computed(() =>
  isGreaterThanTransferMaxAmountFn(amountSend.value, asset.value, isSoraToEvm.value, isRegisteredAsset.value)
);

const isLowerThanMinAmount = computed(() =>
  isLowerThanTransferMinAmountFn(amountSend.value, asset.value, isSoraToEvm.value, isRegisteredAsset.value)
);

const isInsufficientBalance = computed(() => {
  if (!(asset.value && isRegisteredAsset.value && sender.value)) return false;

  return FPNumber.gt(FPNumber.fromNatural(amountSend.value || '0'), FPNumber.fromNatural(maxValue.value || '0'));
});

const isInsufficientXorForFee = computed(() => {
  const xorAsset = xor.value;
  if (!xorAsset) return false;

  return hasInsufficientXorForFee(xorAsset, soraNetworkFee.value);
});

const isInsufficientNativeTokenForFee = computed(() =>
  hasInsufficientNativeTokenForFee(externalNativeBalance.value, externalNetworkFee.value)
);

const formattedSoraNetworkFee = computed(() => getStringFromCodec(soraNetworkFee.value));
const formattedExternalNetworkFee = computed(() =>
  getStringFromCodec(externalNetworkFee.value, nativeTokenDecimals.value)
);
const formattedExternalTransferFee = computed(() =>
  getStringFromCodec(externalTransferFee.value, asset.value?.externalDecimals)
);
const formattedExternalMinBalance = computed(() =>
  getStringFromCodec(assetExternalMinBalance.value, asset.value?.externalDecimals)
);

const isAssetSelected = computed(() => Boolean(asset.value));

const limitCardAmount = computed(() => {
  const limit = isGreaterThanMaxAmount.value ? transferMaxAmount.value : transferMinAmount.value;

  return limit ? limit.toLocaleString() : '';
});

const isXorSufficientForNextOperation = computed(() => {
  if (!asset.value) return false;

  return isXorSufficientForNextTx({
    type: operation.value,
    isXor: isXorAccountAsset(asset.value),
    amount: getFPNumber(amountSend.value || '0'),
  });
});

const isNativeTokenSufficientForNextOperation = computed(() => {
  if (!asset.value || isZeroAmountSend.value) return false;

  const fee = FPNumber.fromCodecValue(externalNetworkFee.value, nativeTokenDecimals.value);
  const balance = FPNumber.fromCodecValue(externalNativeBalance.value, nativeTokenDecimals.value);

  let balanceAfter = balance.sub(fee);

  if (isNativeTokenSelected.value) {
    const amount = new FPNumber(amountSend.value || '0', nativeTokenDecimals.value);
    balanceAfter = isSoraToEvm.value ? balanceAfter.add(amount) : balanceAfter.sub(amount);
  }

  return FPNumber.gte(balanceAfter, fee);
});

const isTxConfirmDisabled = computed(
  () =>
    !isAssetSelected.value ||
    !isRegisteredAsset.value ||
    !areAccountsConnected.value ||
    !isValidNetwork.value ||
    isZeroAmountSend.value ||
    isZeroAmountReceived.value ||
    isInsufficientXorForFee.value ||
    isInsufficientNativeTokenForFee.value ||
    isInsufficientBalance.value ||
    isGreaterThanMaxAmount.value ||
    isLowerThanMinAmount.value
);

const isConfirmTxLoading = computed(
  () =>
    isExternalNetworkLoading.value ||
    isSelectAssetLoading.value ||
    balancesFetching.value ||
    feesAndLockedFundsFetching.value ||
    registeredAssetsFetching.value
);

const setFocusedField = (field: FocusedFieldEnum) => {
  bridgeStore.setFocusedField(field);
};

const setSelectSubNodeDialogVisibility = (flag: boolean) => {
  web3Store.setSelectSubNodeDialogVisibility(flag);
};

const setSendedAmount = async (value?: string) => {
  await bridgeStore.setSendedAmount(value);
};

const setReceivedAmount = async (value?: string) => {
  await bridgeStore.setReceivedAmount(value);
};

const switchDirection = async () => {
  await bridgeStore.switchDirection();
};

const setAssetAddressAction = (value?: string) => bridgeStore.setAssetAddress(value);
const generateHistoryItemAction = (history?: unknown) => bridgeStore.generateHistoryItem(history);
const addAssetToAccountAssets = (address?: string) => walletStore.addAsset(address);
const updateBridgeHistoryAction = () => bridgeStore.updateBridgeHistory();
const setHistoryId = (id?: string) => bridgeStore.setHistoryId(id);
const setSoraToEvmDirection = (value: boolean) => bridgeStore.updateForm({ isSoraToEvm: value });

const getCopyTooltip = (isSoraNetwork = false) => `${formatNetworkShortName(isSoraNetwork)} ${t('addressText')}`;

const getProviderIcon = (isSoraNetwork = false): string => {
  if (isSubBridge.value || isSoraNetwork) return '';

  return evmProvider.value ? getEvmProviderIcon(evmProvider.value) : '';
};

const handleMaxValue = async () => {
  if (!maxValue.value) return;
  await setSendedAmount(maxValue.value);
};

const handleChangeSubNode = () => {
  setSelectSubNodeDialogVisibility(true);
};

const openSelectAssetDialog = () => {
  showSelectTokenDialog.value = true;
};

const updateAssetAddress = async (address: string) => {
  await withSelectAssetLoading(() => setAssetAddressAction(address));
};

const selectAsset = async (selectedAsset?: RegisteredAccountAsset) => {
  if (!selectedAsset) return;
  await updateAssetAddress(selectedAsset.address);
};

const connectExternalWallet = async () => {
  if (isSubAccountType.value) {
    connectSubWallet();
    return;
  }

  await connectEvmWallet();
};

const disconnectExternalWallet = () => {
  if (isSubAccountType.value) {
    disconnectSubWallet();
  } else {
    disconnectEvmWallet();
  }
};

const connectWallet = async (soraToEvm: boolean) => {
  if (soraToEvm) {
    connectSoraWallet();
  } else {
    await connectExternalWallet();
  }
};

const disconnectWallet = (soraToEvm: boolean) => {
  if (soraToEvm) {
    disconnectSoraWallet();
  } else {
    disconnectExternalWallet();
  }
};

const confirmExternalNetworkFeeWarningDialog = () => {
  isWarningExternalFeeDialogConfirmed.value = true;
  showWarningExternalFeeDialog.value = false;
};

const waitOnExternalFeeWarningConfirmation = async (): Promise<void> => {
  if (!showWarningExternalFeeDialog.value) return;

  await delay(500);
  return await waitOnExternalFeeWarningConfirmation();
};

const confirmTransaction = async () => {
  try {
    bridgeTransactionsStore.trackTransferSubmitted({
      direction: isSoraToEvm.value ? 'soraToExternal' : 'externalToSora',
      asset: asset.value?.symbol,
      amount: amountSend.value || null,
      network: networkName.value,
    });

    const tx = (await generateHistoryItemAction()) as { assetAddress?: string; id?: string };
    const { assetAddress, id } = tx;

    if (assetAddress && !accountAssetsAddressTableMap.value[assetAddress]) {
      await addAssetToAccountAssets(assetAddress);
    }

    if (id) {
      setHistoryId(id);
    }

    confirmDialogVisible.value = false;
    await router.push({ name: PageNames.BridgeTransaction });
  } catch (error) {
    console.error(error);
  }
};

const handleConfirmButtonClick = async () => {
  if (isMST.value) {
    showMSTWarning.value = true;
    return;
  }

  if (allowFeePopup.value && !isXorSufficientForNextOperation.value) {
    openWarningFeeDialog();
    await waitOnFeeWarningConfirmation();
    if (!isWarningFeeDialogConfirmed.value) return;
    isWarningFeeDialogConfirmed.value = false;
  }

  if (allowFeePopup.value && !isNativeTokenSufficientForNextOperation.value) {
    showWarningExternalFeeDialog.value = true;
    await waitOnExternalFeeWarningConfirmation();
    if (!isWarningExternalFeeDialogConfirmed.value) return;
    isWarningExternalFeeDialogConfirmed.value = false;
  }

  await confirmOrExecute(confirmTransaction);
};

const handleNextButtonClick = () => {
  if (!areAccountsConnected.value) return;

  if (!isValidNetwork.value) {
    changeEvmNetworkProvided();
    return;
  }

  void handleConfirmButtonClick();
};

const autoupdateRouteParams = async () => {
  const { address, amount, isIncoming } = route.params as {
    address?: string | string[];
    amount?: string | string[];
    isIncoming?: string | boolean | string[];
  };

  const addressParam = Array.isArray(address) ? address[0] : address;
  const amountParam = Array.isArray(amount) ? amount[0] : amount;
  const incomingParam = Array.isArray(isIncoming) ? isIncoming[0] : isIncoming;

  await withLoading(async () => {
    if (typeof amountParam === 'string' && amountParam.length) {
      await setSendedAmount(amountParam);
    }

    if (incomingParam === true || incomingParam === 'true' || incomingParam === '1') {
      setSoraToEvmDirection(false);
    }

    if (typeof addressParam === 'string' && addressParam.length) {
      await updateAssetAddress(addressParam);
    }

    if (isLoggedIn.value) {
      await updateBridgeHistoryAction();
    }
  });
};

watch(
  () => [route.params.address, route.params.amount, route.params.isIncoming],
  () => {
    void autoupdateRouteParams();
  },
  { immediate: true }
);

watch(
  () => isLoggedIn.value,
  (loggedIn, previous) => {
    if (loggedIn && !previous) {
      void withLoading(updateBridgeHistoryAction);
    }
  }
);
</script>

<style lang="scss">
.bridge {
  &-content > .el-card__body {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &-form {
    @include bridge-container;
  }
}
</style>

<style lang="scss" scoped>
@keyframes pulse-animation {
  0% {
    box-shadow: 0 0 0 0px rgba(255, 255, 255, 0.25);
  }
  100% {
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
  }
}

.connect-wallet-logo {
  width: 18px;
  height: 18px;
}

.history-button {
  color: var(--s-color-base-content-tertiary);

  :deep(.s-button__icon > i) {
    color: inherit;
    opacity: 0.7;
  }

  &-icon {
    position: absolute;
    bottom: 4px;
    right: 2px;

    width: 12px;
    height: 12px;
    background: var(--s-color-status-info);
    border-radius: 50%;
    animation: pulse-animation 2s infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
}

.bridge {
  flex-direction: column;
  align-items: center;

  &-content {
    @include bridge-content;
    @include vertical-divider('s-button--switch', $inner-spacing-medium);
    @include vertical-divider('s-divider-tertiary');
    @include buttons;
    @include full-width-button('el-button--next');
    padding: $inner-spacing-big $inner-spacing-big 32px;

    :deep(.el-card__body) {
      padding: 0 !important;
    }

    :deep(.s-button--switch) {
      width: 42px;
      min-width: 42px;
      height: 42px;
      min-height: 42px;
      border: 0;
      box-shadow: var(--s-shadow-element-pressed);
      background-color: var(--s-color-base-border-primary);
      color: var(--s-color-base-content-tertiary);
      font-weight: 500;
      line-height: 14px;
    }

    .input-title {
      &--network {
        white-space: nowrap;
      }
    }

    .network-icon {
      width: calc(var(--s-size-small) / 2);
      height: calc(var(--s-size-small) / 2);
    }

    :deep(.token-input.is-disabled),
    :deep(.token-input.s-disabled) {
      opacity: 1;
      color: var(--s-color-base-content-secondary);
      border-color: var(--s-color-base-border-primary);
    }
  }

  &-header-buttons {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
    margin-left: auto;

    :deep(.el-button--settings) {
      color: var(--s-color-base-content-tertiary);
    }

    :deep(.el-button--settings .s-button__icon > i) {
      color: inherit;
      opacity: 0.7;
    }
  }

  :deep(.header--bridge i.s-icon-info-16) {
    color: var(--s-color-base-content-tertiary);
  }

  &-footer {
    width: min(100%, #{$inner-window-width});
    display: flex;
    justify-content: center;
    margin-top: $inner-spacing-medium;

    &__callout {
      width: min(100%, 560px);
      padding: $inner-spacing-medium $inner-spacing-big;
      border-radius: var(--s-border-radius-small);
      background: var(--s-color-utility-surface);
      border: 1px solid rgba(42, 23, 31, 0.06);
      box-shadow: var(--s-shadow-dialog);
      font-size: var(--s-font-size-small);
      line-height: var(--s-line-height-big);
      color: var(--s-color-base-content-secondary);
      text-align: center;
    }
  }

  &-limit-card {
    margin-top: $inner-spacing-medium;
  }
}

:global([design-system-theme='dark']) .bridge-footer__callout {
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow:
    0 24px 54px rgba(20, 6, 31, 0.28),
    0 1px 0 rgba(255, 255, 255, 0.08) inset;
}
</style>
