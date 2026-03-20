import { z as defineComponent, aZ as components, ak as lazyComponent, at as useRoute, au as useRouter, u as useTranslation, G as useInternalConnect, U as useLoading, H as useAssetsStore, v as useWalletStore, R as useBridgeTransactionsStore, Y as useWeb3Store, aA as watch, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, ap as createVNode, aM as createCommentVNode, am as createBlock, ao as withCtx, bA as withDirectives, aj as unref, h as computed, D as createBaseVNode, dn as FocusedField, aN as toDisplayString, bb as normalizeClass, bQ as Fragment, aO as createTextVNode, aK as KnownSymbols, a9 as ref, ar as isRef, al as Components, dp as isDenominatedAsset, F as FPNumber, ad as asZeroValue, aS as hasInsufficientXorForFee, L as hasInsufficientNativeTokenForFee, V as PageNames, g as getAssetBalance, s as store, dq as getMaxBalance, dr as isXorAccountAsset, aE as delay, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useBridgeCore } from "./useBridgeCore-BwzkDv5F.js";
import { u as useNetworkFormatter } from "./useNetworkFormatter-Cuwa7_ot.js";
import { u as useWeb3Connection } from "./useWeb3Connection-eheLMuCm.js";
import { u as useNetworkFeeWarning, a as useNetworkFeeDialog } from "./useNetworkFeeDialog-BJBwx4Px.js";
import { u as useConfirmDialog } from "./useConfirmDialog-CVL8UdZp.js";
import { u as useTokenSelect } from "./useTokenSelect-DZ9bQ0SE.js";
import { u as useBridgeStore } from "./index-FPtsBGoq.js";
import "./useWalletConnect-CJNIxFYX.js";
const _hoisted_1 = { class: "bridge s-flex" };
const _hoisted_2 = { class: "bridge-header-buttons" };
const _hoisted_3 = {
  key: 0,
  class: "history-button-icon"
};
const _hoisted_4 = { class: "input-title--network" };
const _hoisted_5 = { class: "input-title--network" };
const _hoisted_6 = {
  key: 0,
  class: "bridge-footer"
};
const _hoisted_7 = { class: "bridge-footer__callout" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
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
      TokenAddress: components.TokenAddress
    }
  },
  __name: "Bridge",
  setup(__props) {
    const KnownSymbols$1 = KnownSymbols;
    const FocusedField$1 = FocusedField;
    const route = useRoute();
    const router = useRouter();
    const { t } = useTranslation();
    const { formatStringValue, getStringFromCodec, getFPNumber, getFPNumberFromCodec } = useFormattedAmount();
    const bridgeTitle = computed(() => t("hashiBridgeText"));
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
      soraNetworkFee,
      externalTransferFee,
      nativeTokenSymbol,
      nativeTokenDecimals,
      isNativeTokenSelected,
      getTransferMaxAmount,
      getTransferMinAmount,
      isGreaterThanTransferMaxAmount: isGreaterThanTransferMaxAmountFn,
      isLowerThanTransferMinAmount: isLowerThanTransferMinAmountFn,
      handleViewTransactionsHistory
    } = useBridgeCore();
    const {
      formatSelectedNetwork,
      formatNetworkShortName,
      getNetworkIcon,
      selectedNetworkName: selectedNetworkNameComputed
    } = useNetworkFormatter();
    const {
      evmProvider,
      evmProviderLoading,
      connectEvmWallet,
      disconnectEvmWallet,
      connectSubWallet,
      disconnectSubWallet,
      changeEvmNetworkProvided,
      getEvmProviderIcon
    } = useWeb3Connection();
    const { connectSoraWallet, disconnectSoraWallet, isLoggedIn } = useInternalConnect();
    const { allowFeePopup, accountAssetsAddressTable, isXorSufficientForNextTx } = useNetworkFeeWarning();
    const {
      showWarningFeeDialog,
      isWarningFeeDialogConfirmed,
      openWarningFeeDialog,
      confirmNetworkFeeWariningDialog,
      waitOnFeeWarningConfirmation
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
    const subBridgeConnector = computed(() => bridgeStore.connector);
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
    const isMST = computed(() => Boolean(store.state.wallet.account.isMST));
    const operation = computed(() => bridgeStore.operation);
    const selectedNetworkName = computed(() => selectedNetworkNameComputed.value);
    const accountAssetsAddressTableMap = computed(() => accountAssetsAddressTable.value ?? {});
    const subConnection = computed(() => {
      if (!isSubBridge.value) return null;
      if (networkSelected.value !== subBridgeConnector.value.network?.subNetwork) return null;
      return subBridgeConnector.value.network?.subNetworkConnection ?? null;
    });
    const isExternalNetworkLoading = computed(
      () => isSubBridge.value ? !subConnection.value?.nodeIsConnected : Boolean(evmProviderLoading.value)
    );
    const areAccountsConnected = computed(() => Boolean(sender.value && recipient.value));
    const isDenominatedAsset$1 = computed(() => isDenominatedAsset(asset.value?.address ?? ""));
    const networkName = computed(() => formatNetworkShortName(false));
    const amountDecimals = computed(() => {
      const internal = asset.value?.decimals ?? FPNumber.DEFAULT_PRECISION;
      const external = asset.value?.externalDecimals ?? FPNumber.DEFAULT_PRECISION;
      return Math.min(internal, external);
    });
    const getBalance = (fromSora = true) => {
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
    const firstBalance = computed(() => sender.value ? getBalance(isSoraToEvm.value) : null);
    const secondBalance = computed(() => recipient.value ? getBalance(!isSoraToEvm.value) : null);
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
        isExternalNative: isNativeTokenSelected.value
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
    const isGreaterThanMaxAmount = computed(
      () => isGreaterThanTransferMaxAmountFn(amountSend.value, asset.value, isSoraToEvm.value, isRegisteredAsset.value)
    );
    const isLowerThanMinAmount = computed(
      () => isLowerThanTransferMinAmountFn(amountSend.value, asset.value, isSoraToEvm.value, isRegisteredAsset.value)
    );
    const isInsufficientBalance = computed(() => {
      if (!(asset.value && isRegisteredAsset.value && sender.value)) return false;
      return FPNumber.gt(FPNumber.fromNatural(amountSend.value || "0"), FPNumber.fromNatural(maxValue.value || "0"));
    });
    const isInsufficientXorForFee = computed(() => {
      const xorAsset = xor.value;
      if (!xorAsset) return false;
      return hasInsufficientXorForFee(xorAsset, soraNetworkFee.value);
    });
    const isInsufficientNativeTokenForFee = computed(
      () => hasInsufficientNativeTokenForFee(externalNativeBalance.value, externalNetworkFee.value)
    );
    const formattedSoraNetworkFee = computed(() => getStringFromCodec(soraNetworkFee.value));
    const formattedExternalNetworkFee = computed(
      () => getStringFromCodec(externalNetworkFee.value, nativeTokenDecimals.value)
    );
    const formattedExternalTransferFee = computed(
      () => getStringFromCodec(externalTransferFee.value, asset.value?.externalDecimals)
    );
    const formattedExternalMinBalance = computed(
      () => getStringFromCodec(assetExternalMinBalance.value, asset.value?.externalDecimals)
    );
    const isAssetSelected = computed(() => Boolean(asset.value));
    const limitCardAmount = computed(() => {
      const limit = isGreaterThanMaxAmount.value ? transferMaxAmount.value : transferMinAmount.value;
      return limit ? limit.toLocaleString() : "";
    });
    const isXorSufficientForNextOperation = computed(() => {
      if (!asset.value) return false;
      return isXorSufficientForNextTx({
        type: operation.value,
        isXor: isXorAccountAsset(asset.value),
        amount: getFPNumber(amountSend.value || "0")
      });
    });
    const isNativeTokenSufficientForNextOperation = computed(() => {
      if (!asset.value || isZeroAmountSend.value) return false;
      const fee = FPNumber.fromCodecValue(externalNetworkFee.value, nativeTokenDecimals.value);
      const balance = FPNumber.fromCodecValue(externalNativeBalance.value, nativeTokenDecimals.value);
      let balanceAfter = balance.sub(fee);
      if (isNativeTokenSelected.value) {
        const amount = new FPNumber(amountSend.value || "0", nativeTokenDecimals.value);
        balanceAfter = isSoraToEvm.value ? balanceAfter.add(amount) : balanceAfter.sub(amount);
      }
      return FPNumber.gte(balanceAfter, fee);
    });
    const isTxConfirmDisabled = computed(
      () => !isAssetSelected.value || !isRegisteredAsset.value || !areAccountsConnected.value || !isValidNetwork.value || isZeroAmountSend.value || isZeroAmountReceived.value || isInsufficientXorForFee.value || isInsufficientNativeTokenForFee.value || isInsufficientBalance.value || isGreaterThanMaxAmount.value || isLowerThanMinAmount.value
    );
    const isConfirmTxLoading = computed(
      () => isExternalNetworkLoading.value || isSelectAssetLoading.value || balancesFetching.value || feesAndLockedFundsFetching.value || registeredAssetsFetching.value
    );
    const setFocusedField = (field) => {
      bridgeStore.setFocusedField(field);
    };
    const setSelectSubNodeDialogVisibility = (flag) => {
      store.commit.web3.setSelectSubNodeDialogVisibility(flag);
    };
    const setSendedAmount = async (value) => {
      await bridgeStore.setSendedAmount(value);
    };
    const setReceivedAmount = async (value) => {
      await bridgeStore.setReceivedAmount(value);
    };
    const switchDirection = async () => {
      await bridgeStore.switchDirection();
    };
    const setAssetAddressAction = (value) => bridgeStore.setAssetAddress(value);
    const generateHistoryItemAction = (history) => bridgeStore.generateHistoryItem(history);
    const addAssetToAccountAssets = (address) => walletStore.addAsset(address);
    const updateBridgeHistoryAction = () => bridgeStore.updateBridgeHistory();
    const setHistoryId = (id) => bridgeStore.setHistoryId(id);
    const setSoraToEvmDirection = (value) => bridgeStore.updateForm({ isSoraToEvm: value });
    const getCopyTooltip = (isSoraNetwork = false) => `${formatNetworkShortName(isSoraNetwork)} ${t("addressText")}`;
    const getProviderIcon = (isSoraNetwork = false) => {
      if (isSubBridge.value || isSoraNetwork) return "";
      return evmProvider.value ? getEvmProviderIcon(evmProvider.value) : "";
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
    const updateAssetAddress = async (address) => {
      await withSelectAssetLoading(() => setAssetAddressAction(address));
    };
    const selectAsset = async (selectedAsset) => {
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
    const connectWallet = async (soraToEvm) => {
      if (soraToEvm) {
        connectSoraWallet();
      } else {
        await connectExternalWallet();
      }
    };
    const disconnectWallet = (soraToEvm) => {
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
    const waitOnExternalFeeWarningConfirmation = async () => {
      if (!showWarningExternalFeeDialog.value) return;
      await delay(500);
      return await waitOnExternalFeeWarningConfirmation();
    };
    const confirmTransaction = async () => {
      try {
        bridgeTransactionsStore.trackTransferSubmitted({
          direction: isSoraToEvm.value ? "soraToExternal" : "externalToSora",
          asset: asset.value?.symbol,
          amount: amountSend.value || null,
          network: networkName.value
        });
        const tx = await generateHistoryItemAction();
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
      const { address, amount, isIncoming } = route.params;
      const addressParam = Array.isArray(address) ? address[0] : address;
      const amountParam = Array.isArray(amount) ? amount[0] : amount;
      const incomingParam = Array.isArray(isIncoming) ? isIncoming[0] : isIncoming;
      await withLoading(async () => {
        if (typeof amountParam === "string" && amountParam.length) {
          await setSendedAmount(amountParam);
        }
        if (incomingParam === true || incomingParam === "true" || incomingParam === "1") {
          setSoraToEvmDirection(false);
        }
        if (typeof addressParam === "string" && addressParam.length) {
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
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_bridge_network_selector = resolveComponent("bridge-network-selector");
      const _component_generic_page_header = resolveComponent("generic-page-header");
      const _component_bridge_node_icon = resolveComponent("bridge-node-icon");
      const _component_bridge_account_panel = resolveComponent("bridge-account-panel");
      const _component_token_input = resolveComponent("token-input");
      const _component_bridge_limit_card = resolveComponent("bridge-limit-card");
      const _component_bridge_transaction_details = resolveComponent("bridge-transaction-details");
      const _component_s_card = resolveComponent("s-card");
      const _component_s_form = resolveComponent("s-form");
      const _component_bridge_select_asset = resolveComponent("bridge-select-asset");
      const _component_bridge_select_sub_account = resolveComponent("bridge-select-sub-account");
      const _component_app_browser_m_s_t_warning_bridge = resolveComponent("app-browser-m-s-t-warning-bridge");
      const _component_select_node_dialog = resolveComponent("select-node-dialog");
      const _component_confirm_bridge_transaction_dialog = resolveComponent("confirm-bridge-transaction-dialog");
      const _component_network_fee_warning_dialog = resolveComponent("network-fee-warning-dialog");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_form, {
          class: "bridge-form",
          "show-message": false
        }, {
          default: withCtx(() => [
            withDirectives((openBlock(), createBlock(_component_s_card, {
              class: "bridge-content",
              "border-radius": "medium",
              shadow: "always",
              size: "big",
              primary: ""
            }, {
              default: withCtx(() => [
                createVNode(_component_generic_page_header, {
                  class: "header--bridge",
                  title: bridgeTitle.value,
                  tooltip: unref(t)("bridge.info")
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_2, [
                      unref(isLoggedIn) ? (openBlock(), createBlock(_component_s_button, {
                        key: 0,
                        class: "history-button",
                        type: "action",
                        icon: "time-time-history-24",
                        tooltip: unref(t)("bridgeHistory.showHistory"),
                        "tooltip-placement": "bottom-end",
                        onClick: unref(handleViewTransactionsHistory)
                      }, {
                        default: withCtx(() => [
                          hasWaitingForActionTx.value ? (openBlock(), createElementBlock("span", _hoisted_3)) : createCommentVNode("", true)
                        ]),
                        _: 1
                      }, 8, ["tooltip", "onClick"])) : createCommentVNode("", true),
                      createVNode(_component_bridge_network_selector)
                    ])
                  ]),
                  _: 1
                }, 8, ["title", "tooltip"]),
                createVNode(_component_token_input, {
                  id: "bridgeFrom",
                  "data-test-name": "bridgeFrom",
                  "with-address": "",
                  balance: firstBalance.value ? firstBalance.value.toCodecString() : null,
                  decimals: amountDecimals.value,
                  disabled: !(areAccountsConnected.value && isAssetSelected.value),
                  external: !unref(isSoraToEvm),
                  "without-fiat": !unref(isSoraToEvm) && isDenominatedAsset$1.value,
                  "is-max-available": isMaxAvailable.value,
                  "is-select-available": !autoselectedAssetAddress.value,
                  loading: isConfirmTxLoading.value,
                  "model-value": amountSend.value,
                  title: unref(t)("transfers.from"),
                  token: unref(asset),
                  "onUpdate:modelValue": setSendedAmount,
                  onFocus: _cache[2] || (_cache[2] = ($event) => setFocusedField(unref(FocusedField$1).Sended)),
                  onMax: handleMaxValue,
                  onSelect: openSelectAssetDialog
                }, {
                  "title-append": withCtx(() => [
                    createBaseVNode("span", _hoisted_4, toDisplayString(unref(formatSelectedNetwork)(unref(isSoraToEvm))), 1),
                    createBaseVNode("i", {
                      class: normalizeClass(`network-icon network-icon--${unref(getNetworkIcon)(unref(isSoraToEvm) ? 0 : networkSelected.value)}`)
                    }, null, 2),
                    isSubBridge.value && !unref(isSoraToEvm) ? (openBlock(), createBlock(_component_bridge_node_icon, {
                      key: 0,
                      connection: subConnection.value,
                      onClick: handleChangeSubNode
                    }, null, 8, ["connection"])) : createCommentVNode("", true)
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_bridge_account_panel, {
                      "data-test-name": "connectPolkadot",
                      address: unref(sender),
                      name: senderName.value,
                      tooltip: getCopyTooltip(unref(isSoraToEvm)),
                      icon: getProviderIcon(unref(isSoraToEvm)),
                      onConnect: _cache[0] || (_cache[0] = ($event) => connectWallet(unref(isSoraToEvm))),
                      onDisconnect: _cache[1] || (_cache[1] = ($event) => disconnectWallet(unref(isSoraToEvm)))
                    }, null, 8, ["address", "name", "tooltip", "icon"])
                  ]),
                  _: 1
                }, 8, ["balance", "decimals", "disabled", "external", "without-fiat", "is-max-available", "is-select-available", "loading", "model-value", "title", "token"]),
                createVNode(_component_s_button, {
                  class: "s-button--switch",
                  "data-test-name": "switchToken",
                  type: "action",
                  icon: "arrows-swap-90-24",
                  disabled: isConfirmTxLoading.value,
                  onClick: switchDirection
                }, null, 8, ["disabled"]),
                createVNode(_component_token_input, {
                  id: "bridgeTo",
                  "data-test-name": "bridgeTo",
                  "with-address": "",
                  balance: secondBalance.value ? secondBalance.value.toCodecString() : null,
                  decimals: amountDecimals.value,
                  disabled: !(areAccountsConnected.value && isAssetSelected.value),
                  external: unref(isSoraToEvm),
                  "without-fiat": unref(isSoraToEvm) && isDenominatedAsset$1.value,
                  loading: isConfirmTxLoading.value,
                  "model-value": amountReceived.value,
                  title: unref(t)("transfers.to"),
                  token: unref(asset),
                  "onUpdate:modelValue": setReceivedAmount,
                  onFocus: _cache[5] || (_cache[5] = ($event) => setFocusedField(unref(FocusedField$1).Received)),
                  onSelect: openSelectAssetDialog
                }, {
                  "title-append": withCtx(() => [
                    createBaseVNode("span", _hoisted_5, toDisplayString(unref(formatSelectedNetwork)(!unref(isSoraToEvm))), 1),
                    createBaseVNode("i", {
                      class: normalizeClass(`network-icon network-icon--${unref(getNetworkIcon)(!unref(isSoraToEvm) ? 0 : networkSelected.value)}`)
                    }, null, 2),
                    isSubBridge.value && unref(isSoraToEvm) ? (openBlock(), createBlock(_component_bridge_node_icon, {
                      key: 0,
                      connection: subConnection.value,
                      onClick: handleChangeSubNode
                    }, null, 8, ["connection"])) : createCommentVNode("", true)
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_bridge_account_panel, {
                      "data-test-name": "useMetamaskProvider",
                      address: unref(recipient),
                      name: recipientName.value,
                      tooltip: getCopyTooltip(!unref(isSoraToEvm)),
                      icon: getProviderIcon(!unref(isSoraToEvm)),
                      onConnect: _cache[3] || (_cache[3] = ($event) => connectWallet(!unref(isSoraToEvm))),
                      onDisconnect: _cache[4] || (_cache[4] = ($event) => disconnectWallet(!unref(isSoraToEvm)))
                    }, null, 8, ["address", "name", "tooltip", "icon"])
                  ]),
                  _: 1
                }, 8, ["balance", "decimals", "disabled", "external", "without-fiat", "loading", "model-value", "title", "token"]),
                areAccountsConnected.value ? (openBlock(), createBlock(_component_s_button, {
                  key: 0,
                  class: "el-button--next s-typography-button--large",
                  "data-test-name": "nextButton",
                  type: "primary",
                  disabled: !areAccountsConnected.value || unref(isValidNetwork) && isTxConfirmDisabled.value,
                  loading: areAccountsConnected.value && unref(isValidNetwork) && isConfirmTxLoading.value,
                  onClick: handleNextButtonClick
                }, {
                  default: withCtx(() => [
                    !unref(isValidNetwork) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      createTextVNode(toDisplayString(unref(t)("changeNetworkText")), 1)
                    ], 64)) : !isAssetSelected.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                      createTextVNode(toDisplayString(unref(t)("buttons.chooseAToken")), 1)
                    ], 64)) : !isRegisteredAsset.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                      createTextVNode(toDisplayString(unref(t)("bridge.notRegisteredAsset", { assetSymbol: _ctx.assetSymbol })), 1)
                    ], 64)) : isZeroAmountSend.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                      createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                    ], 64)) : isZeroAmountReceived.value ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [
                      createTextVNode(toDisplayString(unref(t)("swap.insufficientAmount", { tokenSymbol: _ctx.assetSymbol })), 1)
                    ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 5 }, [
                      createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: _ctx.assetSymbol })), 1)
                    ], 64)) : isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 6 }, [
                      createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(KnownSymbols$1).XOR })), 1)
                    ], 64)) : isInsufficientNativeTokenForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 7 }, [
                      createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(nativeTokenSymbol) })), 1)
                    ], 64)) : isGreaterThanMaxAmount.value ? (openBlock(), createElementBlock(Fragment, { key: 8 }, [
                      createTextVNode(toDisplayString(unref(t)("exceededAmountText", { amount: unref(t)("maxAmountText") })), 1)
                    ], 64)) : isLowerThanMinAmount.value ? (openBlock(), createElementBlock(Fragment, { key: 9 }, [
                      createTextVNode(toDisplayString(unref(t)("exceededAmountText", { amount: unref(t)("minAmountText") })), 1)
                    ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 10 }, [
                      createTextVNode(toDisplayString(unref(t)("bridge.next")), 1)
                    ], 64))
                  ]),
                  _: 1
                }, 8, ["disabled", "loading"])) : createCommentVNode("", true),
                areAccountsConnected.value && unref(isValidNetwork) ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  isLowerThanMinAmount.value || isGreaterThanMaxAmount.value ? (openBlock(), createBlock(_component_bridge_limit_card, {
                    key: 0,
                    class: "bridge-limit-card",
                    max: isGreaterThanMaxAmount.value,
                    amount: limitCardAmount.value,
                    symbol: _ctx.assetSymbol
                  }, null, 8, ["max", "amount", "symbol"])) : createCommentVNode("", true),
                  !isZeroAmountReceived.value && isRegisteredAsset.value ? (openBlock(), createBlock(_component_bridge_transaction_details, {
                    key: 1,
                    class: "info-line-container",
                    asset: unref(asset),
                    "native-token": unref(nativeToken),
                    "external-transfer-fee": formattedExternalTransferFee.value,
                    "external-network-fee": formattedExternalNetworkFee.value,
                    "external-min-balance": formattedExternalMinBalance.value,
                    "sora-network-fee": formattedSoraNetworkFee.value,
                    "network-name": networkName.value
                  }, null, 8, ["asset", "native-token", "external-transfer-fee", "external-network-fee", "external-min-balance", "sora-network-fee", "network-name"])) : createCommentVNode("", true)
                ], 64)) : createCommentVNode("", true)
              ]),
              _: 1
            })), [
              [_directive_loading, unref(parentLoading)]
            ])
          ]),
          _: 1
        }),
        !areAccountsConnected.value ? (openBlock(), createElementBlock("div", _hoisted_6, [
          createBaseVNode("div", _hoisted_7, toDisplayString(unref(t)("bridge.connectWallets")), 1)
        ])) : createCommentVNode("", true),
        createVNode(_component_bridge_select_asset, {
          visible: showSelectTokenDialog.value,
          "onUpdate:visible": _cache[6] || (_cache[6] = ($event) => showSelectTokenDialog.value = $event),
          asset: unref(asset),
          onSelect: selectAsset
        }, null, 8, ["visible", "asset"]),
        createVNode(_component_bridge_select_sub_account),
        createVNode(_component_app_browser_m_s_t_warning_bridge, {
          visible: showMSTWarning.value,
          "onUpdate:visible": _cache[7] || (_cache[7] = ($event) => showMSTWarning.value = $event)
        }, null, 8, ["visible"]),
        subConnection.value ? (openBlock(), createBlock(_component_select_node_dialog, {
          key: 1,
          connection: subConnection.value,
          network: selectedNetworkName.value,
          visibility: selectSubNodeDialogVisibility.value,
          "set-visibility": setSelectSubNodeDialogVisibility
        }, null, 8, ["connection", "network", "visibility"])) : createCommentVNode("", true),
        createVNode(_component_confirm_bridge_transaction_dialog, {
          visible: unref(confirmDialogVisible),
          "onUpdate:visible": _cache[8] || (_cache[8] = ($event) => isRef(confirmDialogVisible) ? confirmDialogVisible.value = $event : null),
          "is-sora-to-evm": unref(isSoraToEvm),
          asset: unref(asset),
          "amount-send": amountSend.value,
          "amount-received": amountReceived.value,
          network: networkSelected.value,
          "network-type": networkType.value,
          "native-token": unref(nativeToken),
          "external-transfer-fee": formattedExternalTransferFee.value,
          "external-network-fee": formattedExternalNetworkFee.value,
          "sora-network-fee": formattedSoraNetworkFee.value,
          onConfirm: confirmTransaction
        }, null, 8, ["visible", "is-sora-to-evm", "asset", "amount-send", "amount-received", "network", "network-type", "native-token", "external-transfer-fee", "external-network-fee", "sora-network-fee"]),
        createVNode(_component_network_fee_warning_dialog, {
          visible: unref(showWarningFeeDialog),
          "onUpdate:visible": _cache[9] || (_cache[9] = ($event) => isRef(showWarningFeeDialog) ? showWarningFeeDialog.value = $event : null),
          fee: unref(formatStringValue)(formattedSoraNetworkFee.value),
          onConfirm: unref(confirmNetworkFeeWariningDialog)
        }, null, 8, ["visible", "fee", "onConfirm"]),
        createVNode(_component_network_fee_warning_dialog, {
          visible: showWarningExternalFeeDialog.value,
          "onUpdate:visible": _cache[10] || (_cache[10] = ($event) => showWarningExternalFeeDialog.value = $event),
          fee: unref(formatStringValue)(formattedExternalNetworkFee.value),
          symbol: unref(nativeTokenSymbol),
          payoff: false,
          onConfirm: confirmExternalNetworkFeeWarningDialog
        }, null, 8, ["visible", "fee", "symbol"])
      ]);
    };
  }
});
const Bridge = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-9e62cc6a"]]);
export {
  Bridge as default
};
