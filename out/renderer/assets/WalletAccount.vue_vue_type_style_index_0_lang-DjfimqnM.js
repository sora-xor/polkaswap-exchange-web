import { z as defineComponent, h as computed, a_ as resolveComponent, A as createElementBlock, C as openBlock, am as createBlock, ao as withCtx, D as createBaseVNode, aO as createTextVNode, bb as normalizeClass, ap as createVNode, aN as toDisplayString, bQ as Fragment, bP as renderList, aP as _export_sfc, u as useTranslation, U as useLoading, aA as watch, dU as getAccountIdentity, a9 as ref, bH as normalizeProps, bI as guardReactiveProps, aJ as renderSlot, aj as unref, dV as api, cK as formatAccountAddress, dF as getLegacyStore } from "./index-73GArslZ.js";
import FormattedAddress from "./FormattedAddress-BPe25jN5.js";
import AccountCard from "./AccountCard-xpQIDQ4O.js";
import { _ as _sfc_main$2 } from "./WalletAvatar.vue_vue_type_script_setup_true_lang-mm2xyMMC.js";
const _hoisted_1 = { class: "identity" };
const _hoisted_2 = { class: "account-identity" };
const _hoisted_3 = { class: "identity-data" };
const _hoisted_4 = {
  align: "right",
  class: "identity-data-key"
};
const _hoisted_5 = {
  align: "left",
  class: "identity-data-value"
};
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "Identity",
  props: {
    identity: {},
    localName: { default: "" }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const isApproved = computed(() => Boolean(props.identity?.approved));
    const identityName = computed(() => props.identity?.name ?? "");
    const identityLegalName = computed(() => props.identity?.legalName ?? "");
    const identityIcon = computed(() => isApproved.value ? "basic-check-mark-24" : "notifications-info-24");
    const identityData = computed(
      () => [
        { key: "display", value: identityName.value },
        { key: "legal", value: identityLegalName.value },
        { key: "local", value: props.localName }
      ].filter((item) => Boolean(item.value))
    );
    __expose({
      isApproved,
      identityName,
      identityLegalName,
      identityIcon,
      identityData
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        identityName.value ? (openBlock(), createBlock(_component_s_tooltip, {
          key: 0,
          "border-radius": "mini"
        }, {
          content: withCtx(() => [
            createBaseVNode("table", _hoisted_3, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(identityData.value, (row) => {
                return openBlock(), createElementBlock("tr", {
                  key: row.key
                }, [
                  createBaseVNode("td", _hoisted_4, toDisplayString(row.key), 1),
                  createBaseVNode("td", _hoisted_5, toDisplayString(row.value), 1)
                ]);
              }), 128))
            ])
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("div", {
                class: normalizeClass(["account-identity-status", { approved: isApproved.value }])
              }, [
                createVNode(_component_s_icon, {
                  name: identityIcon.value,
                  size: "12"
                }, null, 8, ["name"])
              ], 2),
              createTextVNode(" " + toDisplayString(identityName.value), 1)
            ])
          ]),
          _: 1
        })) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createTextVNode(toDisplayString(__props.localName), 1)
        ], 64))
      ]);
    };
  }
});
const Identity = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-c99cf8a1"]]);
const DEFAULT_NAME = "<unknown>";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "WalletAccount",
  props: {
    polkadotAccount: { default: null },
    withIdentity: { type: Boolean, default: false },
    chainApi: { default: null }
  },
  emits: ["identity"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const resolveStore = () => getLegacyStore() ?? globalThis.__PS_APP_STORE__;
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { withApi } = useLoading({});
    const resolvedChainApi = computed(() => props.chainApi ?? api);
    const connected = computed(() => resolveStore()?.getters?.["wallet/account/account"]);
    const account = computed(() => props.polkadotAccount ?? connected.value ?? null);
    const address = computed(() => {
      const value = account.value?.address?.trim();
      if (!value) return "";
      return formatAccountAddress(value, true, resolvedChainApi.value) || value;
    });
    const accountIdentity = ref(null);
    watch(
      address,
      async (value, oldValue) => {
        if (!props.withIdentity || value === oldValue || !value) return;
        await withApi(async () => {
          accountIdentity.value = await getAccountIdentity(value, resolvedChainApi.value);
          emit("identity", accountIdentity.value);
        });
      },
      { immediate: true }
    );
    const name = computed(() => {
      if (account.value?.name) {
        return account.value.name;
      }
      const mstAddress = api.mst?.getMstAddress?.();
      if (!mstAddress) {
        return DEFAULT_NAME;
      }
      const mstAccount = api.mst?.getMstAccount?.(mstAddress);
      if (mstAccount?.meta?.name) {
        return mstAccount.meta.name;
      }
      return DEFAULT_NAME;
    });
    const identity = computed(() => account.value?.identity ?? accountIdentity.value);
    __expose({
      account,
      address,
      name,
      identity
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(AccountCard, normalizeProps(guardReactiveProps(_ctx.$attrs)), {
        avatar: withCtx(() => [
          createVNode(_sfc_main$2, {
            class: "account-gravatar",
            address: address.value,
            size: 28
          }, null, 8, ["address"])
        ]),
        name: withCtx(() => [
          identity.value ? (openBlock(), createBlock(Identity, {
            key: 0,
            identity: identity.value,
            "local-name": name.value
          }, null, 8, ["identity", "local-name"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
            createTextVNode(toDisplayString(name.value), 1)
          ], 64))
        ]),
        description: withCtx(() => [
          createVNode(FormattedAddress, {
            value: address.value,
            symbols: 20,
            "tooltip-text": unref(t)("account.walletAddress")
          }, null, 8, ["value", "tooltip-text"])
        ]),
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 16);
    };
  }
});
export {
  _sfc_main as _
};
