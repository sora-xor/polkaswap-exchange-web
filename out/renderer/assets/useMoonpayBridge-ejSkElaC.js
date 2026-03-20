import { G as useInternalConnect, e as useSettingsStore, H as useAssetsStore, I as storeToRefs, s as store, h as computed, J as ethersUtil, K as getEthNetworkFee, L as hasInsufficientNativeTokenForFee, M as getMaxValue, N as clampMoonpayTransferAmount, F as FPNumber, j as BridgeNetworkType, O as Operation } from "./index-73GArslZ.js";
import { M as MoonpayNotifications } from "./consts-Cuk5ZfDH.js";
import { u as useBridgeHistory } from "./useBridgeHistory-BfHU-41q.js";
import { u as useWeb3Connection } from "./useWeb3Connection-eheLMuCm.js";
const createError = (text, notification) => {
  const error = new Error(text);
  error.name = notification;
  return error;
};
function useMoonpayBridge(options = {}) {
  const bridgeHistory = useBridgeHistory({ parentLoading: options.parentLoading });
  const internalWallet = useInternalConnect();
  const walletConnect = useWeb3Connection();
  const settingsStore = useSettingsStore();
  const assetsStore = useAssetsStore();
  const { registeredAssets } = storeToRefs(assetsStore);
  const moonpayApi = computed(() => store.state.moonpay.api);
  const bridgeTransactionData = computed(() => store.state.moonpay.bridgeTransactionData);
  const ethBridgeEvmNetwork = computed(() => store.state.web3.ethBridgeEvmNetwork);
  const soraNetwork = computed(() => settingsStore.soraNetwork);
  const moonpayApiKey = computed(() => settingsStore.moonpayApiKey);
  const contractAddress = store.getters.web3.contractAddress;
  const getAsset = assetsStore.assetDataByAddress;
  const setConfirmationVisibility = (flag) => {
    store.commit.moonpay.setConfirmationVisibility(flag);
  };
  const setNotificationVisibility = (flag) => {
    store.commit.moonpay.setNotificationVisibility(flag);
  };
  const setNotificationKey = (key) => {
    store.commit.moonpay.setNotificationKey(key);
  };
  const setBridgeTxData = (data) => {
    store.commit.moonpay.setBridgeTxData(data);
  };
  const setDialogVisibility = (flag) => {
    store.commit.moonpay.setDialogVisibility(flag);
  };
  const selectExternalNetwork = async (network) => {
    await store.dispatch.web3.selectExternalNetwork(network);
  };
  const getTransactionTransferData = async (hash) => {
    return await store.dispatch.moonpay.getTransactionTranserData(hash);
  };
  const createTransactionsPolling = async () => {
    return await store.dispatch.moonpay.createTransactionsPolling();
  };
  const prepareEvmNetwork = async () => {
    await selectExternalNetwork({
      id: ethBridgeEvmNetwork.value,
      type: BridgeNetworkType.Eth
    });
  };
  const initMoonpayApi = () => {
    moonpayApi.value.publicKey = moonpayApiKey.value;
    moonpayApi.value.soraNetwork = soraNetwork.value ?? "";
  };
  const showNotification = async (key) => {
    setNotificationKey(key);
    setNotificationVisibility(true);
  };
  const handleBridgeInitError = async (error) => {
    if (Object.values(MoonpayNotifications).includes(error.name)) {
      await showNotification(error.name);
    } else {
      console.error(error);
    }
  };
  const getBridgeHistoryItemByMoonpayId = (moonpayId) => {
    const externalHash = moonpayApi.value.accountRecords?.[moonpayId];
    if (!externalHash) return null;
    const entries = Object.values(bridgeHistory.history.value ?? {});
    return entries.find((item) => item.externalHash === externalHash) ?? null;
  };
  const getBridgeMoonpayTransaction = async () => {
    if (!bridgeTransactionData.value) {
      throw new Error("bridgeTransactionData is empty");
    }
    await bridgeHistory.updateInternalHistory();
    const tx = getBridgeHistoryItemByMoonpayId(bridgeTransactionData.value.payload.moonpayId);
    if (tx) {
      return tx;
    }
    return await bridgeHistory.generateHistoryItem(bridgeTransactionData.value);
  };
  const prepareBridgeHistoryItemData = async (transaction) => {
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
      const [soraAddress, registeredAsset] = Object.entries(registeredAssets.value).find(
        ([_, item]) => ethersUtil.addressesAreEqual(item.address, ethTransferData.address)
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
      const evmNetworkFee = await getEthNetworkFee(
        asset,
        registeredAsset.kind,
        contractAddress,
        ethTransferData.amount,
        false,
        internalWallet.soraAddress.value ?? "",
        ethTransferData.to
      );
      const evmNativeBalance = await ethersUtil.getAccountBalance(ethTransferData.to);
      const hasEthForFee = !hasInsufficientNativeTokenForFee(evmNativeBalance, evmNetworkFee);
      if (!hasEthForFee) {
        throw createError("Insufficient ETH for fee", MoonpayNotifications.FeeError);
      }
      const accountAsset = {
        ...asset,
        balance: {},
        externalBalance
      };
      const maxAmount = getMaxValue(accountAsset, evmNetworkFee, {
        isExternalBalance: true,
        isExternalNative
      });
      const amount = clampMoonpayTransferAmount(maxAmount, ethTransferData.amount);
      if (!FPNumber.gt(new FPNumber(amount), FPNumber.ZERO)) {
        throw createError("Insufficient amount", MoonpayNotifications.AmountError);
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
          moonpayId: transaction.id
        }
      };
    });
  };
  const prepareMoonpayTxForBridgeTransfer = async (tx, startBridgeButtonVisibility = false) => {
    try {
      const data = await prepareBridgeHistoryItemData(tx);
      setBridgeTxData({ data, startBridgeButtonVisibility });
      setNotificationVisibility(false);
      setConfirmationVisibility(true);
    } catch (error) {
      await handleBridgeInitError(error);
    }
  };
  const startBridgeForMoonpayTransaction = async () => {
    const tx = await getBridgeMoonpayTransaction();
    await bridgeHistory.showHistory(tx.id);
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
    handleBridgeInitError
  };
}
export {
  useMoonpayBridge as u
};
