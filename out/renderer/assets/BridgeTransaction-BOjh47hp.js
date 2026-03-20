import { z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, U as useLoading, R as useBridgeTransactionsStore, I as storeToRefs, P as useRouterStore, h as computed, a4 as onMounted, aB as onBeforeUnmount, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, ap as createVNode, D as createBaseVNode, am as createBlock, aM as createCommentVNode, ao as withCtx, aj as unref, bA as withDirectives, bb as normalizeClass, aN as toDisplayString, bQ as Fragment, bP as renderList, aK as KnownSymbols, aO as createTextVNode, al as Components, ds as isUnsignedTx, Z as ZeroStringValue, cv as hasInsufficientBalance, aS as hasInsufficientXorForFee, L as hasInsufficientNativeTokenForFee, dt as formatAddress, W as router, db as subBridgeApi, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useBridgeCore } from "./useBridgeCore-BwzkDv5F.js";
import { u as useBridgeTransaction } from "./useBridgeTransaction-pIuDE_YB.js";
import { u as useCopyAddress } from "./useCopyAddress-CJeOU9NK.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useWeb3Connection } from "./useWeb3Connection-eheLMuCm.js";
import { u as useBridgeStore } from "./index-FPtsBGoq.js";
import "./useNetworkFormatter-Cuwa7_ot.js";
import "./useWalletConnect-CJNIxFYX.js";
const _hoisted_1 = { class: "container transaction-container" };
const _hoisted_2 = { class: "transaction-content" };
const _hoisted_3 = { class: "header" };
const _hoisted_4 = { class: "header-details" };
const _hoisted_5 = { class: "header-details-separator" };
const _hoisted_6 = {
  key: 2,
  class: "transaction-approval-text"
};
const FORMATTED_HASH_LENGTH = 24;
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
      LinksDropdown: lazyComponent(Components.LinksDropdown),
      FormattedAmount: components.FormattedAmount,
      InfoLine: components.InfoLine
    }
  },
  __name: "BridgeTransaction",
  setup(__props) {
    const KnownSymbols$1 = KnownSymbols;
    const { t } = useTranslation();
    const { handleCopyAddress, copyTooltip } = useCopyAddress();
    const { formatStringValue, formatCodecNumber, getFiatAmountByString, getFiatAmountByCodecString } = useFormattedAmount();
    const { withParentLoading } = useLoading();
    const { connectEvmWallet } = useWeb3Connection();
    const bridgeStore = useBridgeStore();
    const bridgeTransactionsStore = useBridgeTransactionsStore();
    const { waitingForApprove, inProgressIds, historyInternal } = storeToRefs(bridgeTransactionsStore);
    const bridgeCore = useBridgeCore();
    const routerStore = useRouterStore();
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
      soraNetworkFee
    } = bridgeCore;
    const historyId = computed(() => bridgeStore.history.id);
    const tx = computed(() => {
      const id = historyId.value;
      if (!id) return null;
      return historyInternal.value[id] ?? null;
    });
    const bridgeTransaction = useBridgeTransaction(tx);
    const getNetworkIcon = bridgeTransaction.formatter.getNetworkIcon;
    const getNetworkText = bridgeTransaction.getNetworkText;
    const isOutgoing = bridgeTransaction.isOutgoing;
    const externalNetworkId = bridgeTransaction.externalNetworkId;
    const externalBlockNumber = computed(() => bridgeStore.fees.externalBlockNumber);
    const externalAccount = bridgeTransaction.txExternalAccount;
    const prevRoute = computed(() => routerStore.prev);
    const txIsUnsigned = computed(() => tx.value?.id ? isUnsignedTx(tx.value) : false);
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
    const amount = computed(() => tx.value?.amount ?? "");
    const amountReceived = computed(() => tx.value?.amount2 ?? amount.value);
    const amountFiatValue = computed(() => asset.value ? getFiatAmountByString(amount.value, asset.value) : null);
    const amountReceivedFiatValue = computed(
      () => asset.value ? getFiatAmountByString(amountReceived.value, asset.value) : null
    );
    const formattedAmount = computed(
      () => amount.value && asset.value ? formatStringValue(amount.value, asset.value.decimals) : ""
    );
    const formattedAmountReceived = computed(
      () => amountReceived.value && asset.value ? formatStringValue(amountReceived.value, asset.value.decimals) : ""
    );
    const assetSymbol = computed(() => asset.value?.symbol ?? "");
    const parachainNetworkId = computed(() => {
      const networkId = bridgeTransaction.externalNetworkId.value;
      if (!networkId) return null;
      try {
        return subBridgeApi.getSoraParachain(networkId);
      } catch {
        return null;
      }
    });
    const txSoraNetworkFee = computed(() => tx.value?.soraNetworkFee ?? soraNetworkFee.value);
    const txSoraNetworkFeeFormatted = computed(() => formatCodecNumber(txSoraNetworkFee.value, xor.value?.decimals));
    const txSoraNetworkFeeFiatValue = computed(() => getFiatAmountByCodecString(txSoraNetworkFee.value));
    const txExternalNetworkFee = computed(() => tx.value?.externalNetworkFee ?? externalNetworkFee.value);
    const txExternalNetworkFeeFormatted = computed(
      () => formatCodecNumber(txExternalNetworkFee.value, nativeTokenDecimals.value)
    );
    const txExternalNetworkFeeApproximation = computed(() => {
      if (txExternalNetworkFeeFormatted.value === ZeroStringValue) return false;
      return !tx.value?.externalNetworkFee;
    });
    const txExternalNetworkFeeFiatValue = computed(
      () => nativeToken.value ? getFiatAmountByCodecString(txExternalNetworkFee.value, nativeToken.value) : null
    );
    const txExternalTransferFee = computed(
      () => tx.value?.externalTransferFee ?? ZeroStringValue
    );
    const txExternalTransferFeeFormatted = computed(
      () => formatCodecNumber(txExternalTransferFee.value, asset.value?.externalDecimals)
    );
    const txExternalTransferFeeNotZero = computed(() => txExternalTransferFee.value !== ZeroStringValue);
    const txExternalTransferFeeFiatValue = computed(
      () => asset.value ? getFiatAmountByCodecString(txExternalTransferFee.value, asset.value) : null
    );
    const txParachainBlockId = computed(() => tx.value?.parachainBlockId ?? "");
    const txParachainBlockNumber = computed(() => tx.value?.parachainBlockHeight);
    const txDate = computed(() => bridgeTransaction.formatter.formatDatetime(tx.value));
    const isTxFailed = computed(() => bridgeTransaction.formatter.isFailedState(tx.value));
    const isTxCompleted = computed(() => bridgeTransaction.formatter.isSuccessState(tx.value));
    const isTxWaiting = computed(() => bridgeTransaction.formatter.isWaitingForActionState(tx.value));
    const isTxPending = computed(() => !isTxFailed.value && !isTxCompleted.value);
    const hasRetry = computed(() => isTxFailed.value && (txIsUnsigned.value || bridgeTransaction.isEvmTxType.value));
    const txIsFinilized = computed(() => !isTxPending.value && !isTxWaiting.value && !hasRetry.value);
    const headerIconClasses = computed(() => {
      const iconClass = "header-icon";
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
      return classes.join(" ");
    });
    const transactionStatus = computed(() => {
      if (txIsUnsigned.value || isTxWaiting.value) {
        return t("bridgeTransaction.statuses.waitingForConfirmation");
      }
      if (isTxFailed.value) {
        return t("bridgeTransaction.statuses.failed");
      }
      if (isTxCompleted.value) {
        return t("bridgeTransaction.statuses.done");
      }
      return `${t("bridgeTransaction.statuses.pending")}...`;
    });
    const isGreaterThanMaxAmount = computed(
      () => txIsUnsigned.value && bridgeCore.isGreaterThanTransferMaxAmount(amount.value, asset.value, bridgeTransaction.isOutgoing.value)
    );
    const isLowerThanMinAmount = computed(
      () => txIsUnsigned.value && bridgeCore.isLowerThanTransferMinAmount(amount.value, asset.value, bridgeTransaction.isOutgoing.value)
    );
    const isInsufficientBalance = computed(() => {
      const fee = bridgeTransaction.isOutgoing.value ? txSoraNetworkFee.value : txExternalNetworkFee.value;
      if (!asset.value || !amount.value || !fee) return false;
      return txIsUnsigned.value && hasInsufficientBalance(asset.value, amount.value, fee, {
        isExternalBalance: !bridgeTransaction.isOutgoing.value,
        isExternalNative: isNativeTokenSelected.value
      });
    });
    const isInsufficientXorForFee = computed(
      () => txIsUnsigned.value && hasInsufficientXorForFee(xor.value, txSoraNetworkFee.value)
    );
    const isInsufficientEvmNativeTokenForFee = computed(() => {
      const outgoing = bridgeTransaction.isOutgoing.value;
      return (txIsUnsigned.value && !outgoing || !txIsUnsigned.value && outgoing) && hasInsufficientNativeTokenForFee(externalNativeBalance.value, txExternalNetworkFee.value);
    });
    const txExternalAccount = computed(() => bridgeTransaction.txExternalAccount.value ?? "");
    const isAnotherEvmAddress = computed(() => {
      if (!bridgeTransaction.isEvmTxType.value) return false;
      if (!txExternalAccount.value || !externalAccount.value) return false;
      return txExternalAccount.value.toLowerCase() !== externalAccount.value.toLowerCase();
    });
    const confirmationButtonDisabled = computed(
      () => !(bridgeTransaction.isOutgoing.value || isValidNetwork.value) || isAnotherEvmAddress.value || isInsufficientBalance.value || isGreaterThanMaxAmount.value || isLowerThanMinAmount.value || isInsufficientXorForFee.value || isInsufficientEvmNativeTokenForFee.value || isTxPending.value
    );
    const externalNetworkName = computed(() => {
      const type = bridgeTransaction.externalNetworkType.value;
      const id = bridgeTransaction.externalNetworkId.value;
      if (!(type && id)) return "";
      return bridgeTransaction.formatter.getNetworkName(type, id);
    });
    const parachainExplorerLinks = computed(() => {
      const type = bridgeTransaction.externalNetworkType.value;
      const networkId = parachainNetworkId.value;
      if (!(type && networkId)) return [];
      return bridgeTransaction.formatter.getNetworkExplorerLinks(type, networkId, "", txParachainBlockNumber.value);
    });
    const confirmationBlocksLeft = computed(() => {
      if (!(bridgeTransaction.isEvmTxType.value && !bridgeTransaction.isOutgoing.value && bridgeTransaction.txExternalBlockNumber.value && externalBlockNumber.value)) {
        return 0;
      }
      const blocksLeft = (bridgeTransaction.txExternalBlockNumber.value ?? 0) + 30 - externalBlockNumber.value;
      return Math.max(blocksLeft, 0);
    });
    const failedClass = computed(() => isTxFailed.value && !isTxWaiting.value ? "info-line--error" : "");
    const txInternalHash = computed(() => {
      if (!bridgeTransaction.isOutgoing.value) return bridgeTransaction.txSoraHash.value;
      return bridgeTransaction.txSoraHash.value || bridgeTransaction.txInternalBlockId.value || bridgeTransaction.txSoraId.value;
    });
    const parachainLinks = computed(() => parachainExplorerLinks.value);
    const accountLinks = computed(() => {
      const name = t("accountAddressText");
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
      const txHashName = t("bridgeTransaction.transactionHash");
      const txBlockName = t("transaction.blockId");
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
    function sortLinksByTxDirection(outgoingOrderedLinks) {
      const links = outgoingOrderedLinks.filter(Boolean);
      return bridgeTransaction.isOutgoing.value ? links : [...links].reverse();
    }
    function getLinkData(value, links, name, networkId) {
      if (!value) return null;
      const placeholder = bridgeTransaction.getNetworkText(name, networkId);
      return {
        value,
        formatted: formatAddress(value, FORMATTED_HASH_LENGTH),
        placeholder,
        tooltip: copyTooltip(placeholder),
        links
      };
    }
    async function handleTransaction(withAutoStart = true) {
      if (withAutoStart && tx.value?.id) {
        await bridgeStore.handleBridgeTransaction(tx.value.id);
      }
    }
    function handleBack() {
      if (prevRoute.value) {
        router.push({ name: prevRoute.value });
        return;
      }
      navigateToBridge();
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
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_generic_page_header = resolveComponent("generic-page-header");
      const _component_s_input = resolveComponent("s-input");
      const _component_links_dropdown = resolveComponent("links-dropdown");
      const _component_info_line = resolveComponent("info-line");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_generic_page_header, {
          "has-button-back": "",
          title: unref(t)("bridgeTransaction.title"),
          onBack: handleBack
        }, {
          default: withCtx(() => [
            createVNode(_component_s_button, {
              class: "el-button--history",
              type: "action",
              icon: "time-time-history-24",
              tooltip: unref(t)("bridgeHistory.showHistory"),
              "tooltip-placement": "bottom-end",
              onClick: unref(handleViewTransactionsHistory)
            }, null, 8, ["tooltip", "onClick"])
          ]),
          _: 1
        }, 8, ["title"]),
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            withDirectives(createBaseVNode("div", {
              class: normalizeClass(headerIconClasses.value)
            }, null, 2), [
              [_directive_loading, isTxPending.value]
            ]),
            createBaseVNode("h5", _hoisted_4, [
              createVNode(unref(formattedAmount), {
                class: "info-line-value",
                "value-can-be-hidden": "",
                value: formattedAmount.value,
                "asset-symbol": assetSymbol.value
              }, {
                default: withCtx(() => [
                  createBaseVNode("i", {
                    class: normalizeClass(`network-icon network-icon--${unref(getNetworkIcon)(unref(isOutgoing) ? 0 : unref(externalNetworkId))}`)
                  }, null, 2)
                ]),
                _: 1
              }, 8, ["value", "asset-symbol"]),
              createBaseVNode("span", _hoisted_5, toDisplayString(unref(t)("bridgeTransaction.for")), 1),
              createVNode(unref(formattedAmount), {
                class: "info-line-value",
                "value-can-be-hidden": "",
                value: formattedAmountReceived.value,
                "asset-symbol": assetSymbol.value
              }, {
                default: withCtx(() => [
                  createBaseVNode("i", {
                    class: normalizeClass(`network-icon network-icon--${unref(getNetworkIcon)(unref(isOutgoing) ? unref(externalNetworkId) : 0)}`)
                  }, null, 2)
                ]),
                _: 1
              }, 8, ["value", "asset-symbol"])
            ])
          ]),
          (openBlock(true), createElementBlock(Fragment, null, renderList(accountLinks.value, ({ value, formatted, placeholder, tooltip, links }) => {
            return openBlock(), createElementBlock("div", {
              class: "transaction-hash-container transaction-hash-container--with-dropdown",
              key: value
            }, [
              createVNode(_component_s_input, {
                placeholder,
                value: formatted,
                readonly: ""
              }, null, 8, ["placeholder", "value"]),
              createVNode(_component_s_button, {
                class: "s-button--hash-copy",
                type: "action",
                alternative: "",
                icon: "basic-copy-24",
                tooltip,
                onClick: ($event) => unref(handleCopyAddress)(value, $event)
              }, null, 8, ["tooltip", "onClick"]),
              links.length ? (openBlock(), createBlock(_component_links_dropdown, {
                key: 0,
                links
              }, null, 8, ["links"])) : createCommentVNode("", true)
            ]);
          }), 128)),
          createVNode(_component_info_line, {
            class: normalizeClass(failedClass.value),
            label: unref(t)("bridgeTransaction.networkInfo.status"),
            value: transactionStatus.value
          }, null, 8, ["class", "label", "value"]),
          createVNode(_component_info_line, {
            label: unref(t)("bridgeTransaction.networkInfo.date"),
            value: txDate.value
          }, null, 8, ["label", "value"]),
          amount.value ? (openBlock(), createBlock(_component_info_line, {
            key: 0,
            "is-formatted": "",
            "value-can-be-hidden": "",
            label: unref(t)("bridgeTransaction.networkInfo.amount"),
            value: formattedAmount.value,
            "asset-symbol": assetSymbol.value,
            "fiat-value": amountFiatValue.value
          }, null, 8, ["label", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true),
          amountReceived.value ? (openBlock(), createBlock(_component_info_line, {
            key: 1,
            "is-formatted": "",
            "value-can-be-hidden": "",
            label: unref(t)("receivedText"),
            value: formattedAmountReceived.value,
            "asset-symbol": assetSymbol.value,
            "fiat-value": amountReceivedFiatValue.value
          }, null, 8, ["label", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true),
          createVNode(_component_info_line, {
            "is-formatted": "",
            label: unref(getNetworkText)(unref(t)("bridgeTransaction.networkInfo.transactionFee")),
            value: txSoraNetworkFeeFormatted.value,
            "asset-symbol": unref(KnownSymbols$1).XOR,
            "fiat-value": txSoraNetworkFeeFiatValue.value
          }, null, 8, ["label", "value", "asset-symbol", "fiat-value"]),
          createVNode(_component_info_line, {
            "is-formatted": "",
            label: unref(getNetworkText)(
              unref(t)("bridgeTransaction.networkInfo.transactionFee"),
              unref(externalNetworkId),
              txExternalNetworkFeeApproximation.value
            ),
            value: txExternalNetworkFeeFormatted.value,
            "asset-symbol": unref(nativeTokenSymbol),
            "fiat-value": txExternalNetworkFeeFiatValue.value
          }, null, 8, ["label", "value", "asset-symbol", "fiat-value"]),
          txExternalTransferFeeNotZero.value ? (openBlock(), createBlock(_component_info_line, {
            key: 2,
            "is-formatted": "",
            label: unref(t)("bridge.externalTransferFee", { network: externalNetworkName.value }),
            value: txExternalTransferFeeFormatted.value,
            "asset-symbol": assetSymbol.value,
            "fiat-value": txExternalTransferFeeFiatValue.value
          }, null, 8, ["label", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true),
          (openBlock(true), createElementBlock(Fragment, null, renderList(transactionLinks.value, ({ value, formatted, placeholder, tooltip, links }) => {
            return openBlock(), createElementBlock("div", {
              class: "transaction-hash-container transaction-hash-container--with-dropdown",
              key: value
            }, [
              createVNode(_component_s_input, {
                placeholder,
                value: formatted,
                readonly: ""
              }, null, 8, ["placeholder", "value"]),
              createVNode(_component_s_button, {
                class: "s-button--hash-copy",
                type: "action",
                alternative: "",
                icon: "basic-copy-24",
                tooltip,
                onClick: ($event) => unref(handleCopyAddress)(value, $event)
              }, null, 8, ["tooltip", "onClick"]),
              links.length ? (openBlock(), createBlock(_component_links_dropdown, {
                key: 0,
                links
              }, null, 8, ["links"])) : createCommentVNode("", true)
            ]);
          }), 128)),
          !txIsFinilized.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
            isAnotherEvmAddress.value ? (openBlock(), createBlock(_component_s_button, {
              key: 0,
              type: "primary",
              onClick: unref(connectEvmWallet)
            }, {
              default: withCtx(() => [
                !unref(externalAccount) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("changeAccountText")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["onClick"])) : (openBlock(), createBlock(_component_s_button, {
              key: 1,
              type: "primary",
              class: "s-typograhy-button--big",
              disabled: confirmationButtonDisabled.value,
              onClick: handleTransaction
            }, {
              default: withCtx(() => [
                confirmationBlocksLeft.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("bridgeTransaction.blocksLeft", { count: confirmationBlocksLeft.value })), 1)
                ], 64)) : txWaitingForApprove.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("bridgeTransaction.allowToken", { tokenSymbol: assetSymbol.value })), 1)
                ], 64)) : isTxPending.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("bridgeTransaction.pending")), 1)
                ], 64)) : !(unref(isOutgoing) || unref(isValidNetwork)) ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)("changeNetworkText")), 1)
                ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: assetSymbol.value })), 1)
                ], 64)) : isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 5 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(KnownSymbols$1).XOR })), 1)
                ], 64)) : isInsufficientEvmNativeTokenForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 6 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(nativeTokenSymbol) })), 1)
                ], 64)) : isGreaterThanMaxAmount.value ? (openBlock(), createElementBlock(Fragment, { key: 7 }, [
                  createTextVNode(toDisplayString(unref(t)("exceededAmountText", { amount: unref(t)("maxAmountText") })), 1)
                ], 64)) : isLowerThanMinAmount.value ? (openBlock(), createElementBlock(Fragment, { key: 8 }, [
                  createTextVNode(toDisplayString(unref(t)("exceededAmountText", { amount: unref(t)("minAmountText") })), 1)
                ], 64)) : isTxWaiting.value ? (openBlock(), createElementBlock(Fragment, { key: 9 }, [
                  createTextVNode(toDisplayString(unref(t)("confirmTransactionText")), 1)
                ], 64)) : hasRetry.value ? (openBlock(), createElementBlock(Fragment, { key: 10 }, [
                  createTextVNode(toDisplayString(unref(t)("retryText")), 1)
                ], 64)) : createCommentVNode("", true)
              ]),
              _: 1
            }, 8, ["disabled"])),
            txWaitingForApprove.value ? (openBlock(), createElementBlock("div", _hoisted_6, toDisplayString(unref(t)("bridgeTransaction.approveToken")), 1)) : createCommentVNode("", true)
          ], 64)) : createCommentVNode("", true)
        ]),
        txIsFinilized.value ? (openBlock(), createBlock(_component_s_button, {
          key: 0,
          class: "s-typography-button--large",
          type: "secondary",
          onClick: unref(navigateToBridge)
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("bridgeTransaction.newTransaction")), 1)
          ]),
          _: 1
        }, 8, ["onClick"])) : createCommentVNode("", true)
      ]);
    };
  }
});
const BridgeTransaction = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-09ba1855"]]);
export {
  BridgeTransaction as default
};
