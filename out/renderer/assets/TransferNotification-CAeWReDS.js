import { z as defineComponent, aZ as components, R as useBridgeTransactionsStore, bu as useModel, u as useTranslation, H as useAssetsStore, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aq as withModifiers, aM as createCommentVNode, h as computed, bH as normalizeProps, as as mergeProps, D as createBaseVNode, aN as toDisplayString, aj as unref, aO as createTextVNode, J as ethersUtil, s as store, db as subBridgeApi, j as BridgeNetworkType, t as toSafeExternalLink, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useBridgeTransaction } from "./useBridgeTransaction-pIuDE_YB.js";
import "./useNetworkFormatter-Cuwa7_ot.js";
const _hoisted_1 = { class: "token-icons" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      SimpleNotification: components.SimpleNotification,
      DialogBase: components.DialogBase,
      TokenLogo: components.TokenLogo,
      ExternalLink: components.ExternalLink
    }
  },
  __name: "TransferNotification",
  props: {
    "visible": { type: Boolean, ...{
      default: false
    } },
    "visibleModifiers": {}
  },
  emits: ["update:visible"],
  setup(__props) {
    const bridgeTransactionsStore = useBridgeTransactionsStore();
    const visible = useModel(__props, "visible", {
      set(value) {
        if (!value) {
          bridgeTransactionsStore.setNotificationData();
        }
        return value;
      }
    });
    const { t, tc } = useTranslation();
    const notificationData = computed(() => bridgeTransactionsStore.notificationData);
    const subBridgeConnector = computed(() => store.state.bridge.subBridgeConnector);
    const whitelist = computed(() => store.getters.wallet.account.whitelist);
    const assetsStore = useAssetsStore();
    const asset = computed(() => {
      const address = notificationData.value?.assetAddress;
      if (!address) return null;
      return assetsStore.assetDataByAddress(address);
    });
    const assetSymbol = computed(() => asset.value?.symbol ?? "");
    const bridgeTransaction = useBridgeTransaction(notificationData);
    const isSubEvm = computed(() => subBridgeApi.isEvmAccount(notificationData.value?.externalNetwork));
    const isEvmNetwork = computed(() => {
      const type = notificationData.value?.externalNetworkType;
      if (!type) return false;
      if (type === BridgeNetworkType.Sub && !isSubEvm.value) return false;
      return true;
    });
    const addTokenBtnVisibility = computed(() => {
      if (!isEvmNetwork.value) return false;
      const address = asset.value?.externalAddress;
      return !!address && !ethersUtil.isNativeEvmTokenAddress(address) && bridgeTransaction.isOutgoing.value;
    });
    const selectPrimaryLink = (links, fallback) => bridgeTransaction.isOutgoing.value ? links[0] : fallback[0];
    const prepareLink = (link, externalNetworkId, isTxLink = true) => {
      if (!link) return null;
      const href = toSafeExternalLink(link.value);
      if (!href) return null;
      const linkText = isTxLink ? tc("transactionText", 1) : tc("accountText", 1);
      return {
        href,
        title: bridgeTransaction.getNetworkText(linkText, externalNetworkId)
      };
    };
    const txLink = computed(
      () => prepareLink(
        selectPrimaryLink(bridgeTransaction.externalExplorerLinks.value, bridgeTransaction.internalExplorerLinks.value),
        bridgeTransaction.isOutgoing.value ? bridgeTransaction.externalNetworkId.value : void 0
      )
    );
    const txAccountLink = computed(
      () => prepareLink(
        selectPrimaryLink(bridgeTransaction.externalAccountLinks.value, bridgeTransaction.internalAccountLinks.value),
        bridgeTransaction.isOutgoing.value ? bridgeTransaction.externalNetworkId.value : void 0,
        false
      )
    );
    function close() {
      visible.value = false;
      bridgeTransactionsStore.setNotificationData();
    }
    async function addToken() {
      if (!asset.value) return;
      try {
        const { externalAddress, externalDecimals, symbol, address } = asset.value;
        const image = whitelist.value[address]?.icon;
        let tokenAddress = externalAddress;
        let tokenSymbol = symbol;
        let tokenDecimals = Number(externalDecimals);
        if (isSubEvm.value) {
          const adapter = subBridgeConnector.value.parachain;
          if (!adapter) throw new Error("Adapter not found");
          const assetMeta = adapter.getAssetMeta(asset.value);
          if (!assetMeta) throw new Error("Asset metadata not found");
          tokenAddress = adapter.assetIdToEvmContractAddress(externalAddress);
          tokenSymbol = assetMeta.symbol;
          tokenDecimals = assetMeta.decimals;
        }
        await ethersUtil.addToken(tokenAddress, tokenSymbol, tokenDecimals, image);
      } catch (error) {
        console.error(error);
      } finally {
        close();
      }
    }
    return (_ctx, _cache) => {
      const _component_external_link = resolveComponent("external-link");
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_button = resolveComponent("s-button");
      const _component_simple_notification = resolveComponent("simple-notification");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visible.value = $event),
        class: "bridge-transfer-notification"
      }, {
        default: withCtx(() => [
          createVNode(_component_simple_notification, {
            "modal-content": "",
            success: "",
            onSubmit: withModifiers(close, ["prevent"])
          }, {
            title: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("bridgeTransferNotification.title")), 1)
            ]),
            default: withCtx(() => [
              txLink.value ? (openBlock(), createBlock(_component_external_link, normalizeProps(mergeProps({ key: 0 }, txLink.value)), null, 16)) : createCommentVNode("", true),
              txAccountLink.value ? (openBlock(), createBlock(_component_external_link, normalizeProps(mergeProps({ key: 1 }, txAccountLink.value)), null, 16)) : createCommentVNode("", true),
              addTokenBtnVisibility.value ? (openBlock(), createBlock(_component_s_button, {
                key: 2,
                onClick: addToken,
                class: "add-token-btn s-typography-button--big"
              }, {
                default: withCtx(() => [
                  createBaseVNode("span", null, toDisplayString(unref(t)("bridgeTransferNotification.addToken", { symbol: assetSymbol.value })), 1),
                  createBaseVNode("div", _hoisted_1, [
                    createVNode(_component_token_logo, {
                      size: "small",
                      token: asset.value
                    }, null, 8, ["token"])
                  ]),
                  createBaseVNode("span", null, toDisplayString(unref(t)("operations.andText")) + " " + toDisplayString(unref(t)("closeText")), 1)
                ]),
                _: 1
              })) : createCommentVNode("", true)
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});
const TransferNotification = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5d0a07a6"]]);
export {
  TransferNotification as default
};
