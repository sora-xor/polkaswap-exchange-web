import { FPNumber, Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { storeToRefs } from 'pinia';
import { computed, type Ref } from 'vue';

import { MoonpayNotifications } from '@/features/deposit/components/moonpay/consts';
import { useBridgeHistory } from '@/composables/useBridgeHistory';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useWeb3Connection } from '@/composables/useWeb3Connection';
import { KnownEthBridgeAsset } from '@/consts/evm';
import { useAssetsStore } from '@/stores/assets';
import type { BridgeRegisteredAsset } from '@/stores/assets/types';
import { useMoonpayStore } from '@/stores/moonpay';
import type { BridgeTxData } from '@/stores/moonpay/types';
import { useSettingsStore } from '@/stores/settings';
import { useWeb3Store } from '@/stores/web3';
import type { Nullable, FnWithoutArgs } from '@/types/common';
import { getMaxValue, hasInsufficientNativeTokenForFee } from '@/utils';
import { getEthNetworkFee } from '@/utils/bridge/eth/utils';
import ethersUtil from '@/utils/ethers-util';
import {
  clampMoonpayTransferAmount,
  type MoonpayEVMTransferAssetData,
  type MoonpayTransaction,
  type MoonpayApi,
} from '@/utils/moonpay';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset, AccountBalance } from '@sora-substrate/sdk/build/assets/types';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { SoraNetwork } from '@/lib/soraneo-wallet/src/consts';

type ParentLoadingSource = Ref<boolean> | (() => boolean);

type UseMoonpayBridgeOptions = {
  parentLoading?: ParentLoadingSource;
};

const createError = (text: string, notification: MoonpayNotifications) => {
  const error = new Error(text);
  error.name = notification;
  return error;
};

/**
 * Composition API helper that mirrors the responsibilities of the
 * `MoonpayBridgeInitMixin`. It combines bridge history helpers with wallet
 * connectivity utilities and Moonpay-specific store orchestration.
 */
export function useMoonpayBridge(options: UseMoonpayBridgeOptions = {}) {
  const bridgeHistory = useBridgeHistory<EthHistory>({ parentLoading: options.parentLoading });
  const internalWallet = useInternalConnect();
  const walletConnect = useWeb3Connection();

  const settingsStore = useSettingsStore();
  const web3Store = useWeb3Store();
  const moonpayStore = useMoonpayStore();
  const assetsStore = useAssetsStore();
  const { registeredAssets } = storeToRefs(assetsStore);
  const moonpayApi = computed(() => moonpayStore.api as MoonpayApi);
  const bridgeTransactionData = computed(() => moonpayStore.bridgeTransactionData as Nullable<EthHistory>);
  const ethBridgeEvmNetwork = computed(() => web3Store.ethBridgeEvmNetwork as Nullable<EvmNetwork>);
  const soraNetwork = computed(() => settingsStore.soraNetwork as Nullable<SoraNetwork>);
  const moonpayApiKey = computed(() => settingsStore.moonpayApiKey);
  const contractAddress = computed(() => web3Store.contractAddress as (asset: KnownEthBridgeAsset) => string);
  const getAsset = assetsStore.assetDataByAddress as (addr?: string) => RegisteredAccountAsset;

  const setConfirmationVisibility = (flag: boolean) => {
    moonpayStore.setConfirmationVisibility(flag);
  };

  const setNotificationVisibility = (flag: boolean) => {
    moonpayStore.setNotificationVisibility(flag);
  };

  const setNotificationKey = (key: string) => {
    moonpayStore.setNotificationKey(key as MoonpayNotifications | '');
  };

  const setBridgeTxData = (data?: BridgeTxData) => {
    moonpayStore.setBridgeTxData(data);
  };

  const setDialogVisibility = (flag: boolean) => {
    moonpayStore.setDialogVisibility(flag);
  };

  const selectExternalNetwork = async (network: { id: BridgeNetworkId; type: BridgeNetworkType }) => {
    await web3Store.selectExternalNetwork(network);
  };

  const getTransactionTransferData = async (hash: string): Promise<Nullable<MoonpayEVMTransferAssetData>> => {
    return await moonpayStore.getTransactionTranserData(hash);
  };

  const createTransactionsPolling = async () => {
    return (await moonpayStore.createTransactionsPolling()) as FnWithoutArgs;
  };

  const prepareEvmNetwork = async () => {
    await selectExternalNetwork({
      id: ethBridgeEvmNetwork.value,
      type: BridgeNetworkType.Eth,
    });
  };

  const initMoonpayApi = () => {
    moonpayApi.value.publicKey = moonpayApiKey.value;
    moonpayApi.value.soraNetwork = soraNetwork.value ?? '';
  };

  const showNotification = async (key: MoonpayNotifications): Promise<void> => {
    setNotificationKey(key);
    setNotificationVisibility(true);
  };

  const handleBridgeInitError = async (error: Error): Promise<void> => {
    if (Object.values(MoonpayNotifications).includes(error.name as MoonpayNotifications)) {
      await showNotification(error.name as MoonpayNotifications);
    } else {
      console.error(error);
    }
  };

  const getBridgeHistoryItemByMoonpayId = (moonpayId: string): Nullable<EthHistory> => {
    const externalHash = moonpayApi.value.accountRecords?.[moonpayId];

    if (!externalHash) return null;

    const entries = Object.values(bridgeHistory.history.value ?? {}) as EthHistory[];

    return entries.find((item) => item.externalHash === externalHash) ?? null;
  };

  const getBridgeMoonpayTransaction = async (): Promise<EthHistory> => {
    if (!bridgeTransactionData.value) {
      throw new Error('bridgeTransactionData is empty');
    }

    await bridgeHistory.updateInternalHistory();

    const tx = getBridgeHistoryItemByMoonpayId(bridgeTransactionData.value.payload.moonpayId);

    if (tx) {
      return tx;
    }

    return await bridgeHistory.generateHistoryItem(bridgeTransactionData.value);
  };

  const prepareBridgeHistoryItemData = async (transaction: MoonpayTransaction): Promise<EthHistory> => {
    return await bridgeHistory.withLoading(async () => {
      await prepareEvmNetwork();
      const ethTransferData = await getTransactionTransferData(transaction.cryptoTransactionId);

      if (!ethTransferData) {
        throw createError(
          `Cannot fetch transaction data: ${transaction.cryptoTransactionId}`,
          MoonpayNotifications.TransactionError
        );
      }

      const isAccountConnected = await ethersUtil.checkAccountIsConnected(ethTransferData.to);

      if (!isAccountConnected) {
        throw createError(
          `Account for transfer is not connected: ${ethTransferData.to}`,
          MoonpayNotifications.AccountAddressError
        );
      }

      const [soraAddress, registeredAsset] =
        Object.entries(registeredAssets.value).find(([_, item]) =>
          ethersUtil.addressesAreEqual(item.address, ethTransferData.address)
        ) ?? [];

      if (!soraAddress || !registeredAsset) {
        throw createError(
          `Asset is not registered: ethereum address ${ethTransferData.address}`,
          MoonpayNotifications.SupportError
        );
      }

      const isExternalNative = ethersUtil.isNativeEvmTokenAddress(registeredAsset.address);
      const externalBalance = await ethersUtil.getAccountAssetBalance(ethTransferData.to, registeredAsset.address);
      const asset = getAsset(soraAddress);

      if (!asset) {
        throw createError(`Asset data is unavailable for ${soraAddress}`, MoonpayNotifications.SupportError);
      }

      const evmNetworkFee: CodecString = await getEthNetworkFee(
        asset,
        registeredAsset.kind,
        contractAddress.value,
        ethTransferData.amount,
        false,
        internalWallet.soraAddress.value ?? '',
        ethTransferData.to
      );

      const evmNativeBalance = await ethersUtil.getAccountBalance(ethTransferData.to);
      const hasEthForFee = !hasInsufficientNativeTokenForFee(evmNativeBalance, evmNetworkFee);

      if (!hasEthForFee) {
        throw createError('Insufficient ETH for fee', MoonpayNotifications.FeeError);
      }

      const accountAsset = {
        ...asset,
        balance: {} as AccountBalance,
        externalBalance,
      };

      const maxAmount = getMaxValue(accountAsset, evmNetworkFee, {
        isExternalBalance: true,
        isExternalNative,
      });
      const amount = clampMoonpayTransferAmount(maxAmount, ethTransferData.amount);

      if (!FPNumber.gt(new FPNumber(amount), FPNumber.ZERO)) {
        throw createError('Insufficient amount', MoonpayNotifications.AmountError);
      }

      return {
        type: Operation.EthBridgeIncoming,
        amount,
        amount2: amount,
        symbol: accountAsset.symbol,
        assetAddress: accountAsset.address,
        soraNetworkFee: bridgeHistory.networkFees.value[Operation.EthBridgeIncoming],
        externalNetworkFee: evmNetworkFee,
        externalNetwork: ethBridgeEvmNetwork.value,
        externalNetworkType: BridgeNetworkType.Eth,
        to: ethTransferData.to,
        payload: {
          moonpayId: transaction.id,
        },
      } as EthHistory;
    });
  };

  const prepareMoonpayTxForBridgeTransfer = async (
    tx: MoonpayTransaction,
    startBridgeButtonVisibility = false
  ): Promise<void> => {
    try {
      const data = await prepareBridgeHistoryItemData(tx);
      setBridgeTxData({ data, startBridgeButtonVisibility });
      setNotificationVisibility(false);
      setConfirmationVisibility(true);
    } catch (error: any) {
      await handleBridgeInitError(error);
    }
  };

  const startBridgeForMoonpayTransaction = async (): Promise<void> => {
    const tx = await getBridgeMoonpayTransaction();
    await bridgeHistory.showHistory(tx.id as string);
    setBridgeTxData();
  };

  return {
    ...bridgeHistory,
    internalWallet,
    walletConnect,
    moonpayApi,
    bridgeTransactionData,
    ethBridgeEvmNetwork,
    soraNetwork,
    registeredAssets,
    getAsset,
    prepareEvmNetwork,
    initMoonpayApi,
    prepareMoonpayTxForBridgeTransfer,
    getBridgeMoonpayTransaction,
    getBridgeHistoryItemByMoonpayId,
    startBridgeForMoonpayTransaction,
    prepareBridgeHistoryItemData,
    setBridgeTxData,
    setDialogVisibility,
    setNotificationVisibility,
    setNotificationKey,
    setConfirmationVisibility,
    getTransactionTransferData,
    selectExternalNetwork,
    createTransactionsPolling,
    showNotification,
    handleBridgeInitError,
  };
}

export type MoonpayBridgeComposable = ReturnType<typeof useMoonpayBridge>;
