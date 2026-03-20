import { z as defineComponent, u as useTranslation, a9 as ref, A as createElementBlock, C as openBlock, D as createBaseVNode, aN as toDisplayString, aj as unref, h as computed, bA as withDirectives, cz as vModelSelect, bQ as Fragment, bP as renderList, cA as vModelText, aM as createCommentVNode, bb as normalizeClass, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "sccp-page" };
const _hoisted_2 = { class: "sccp-card" };
const _hoisted_3 = { class: "sccp-header" };
const _hoisted_4 = { class: "sccp-title" };
const _hoisted_5 = { class: "sccp-subtitle" };
const _hoisted_6 = { class: "sccp-hint" };
const _hoisted_7 = { class: "sccp-form-grid" };
const _hoisted_8 = { class: "sccp-field" };
const _hoisted_9 = ["value"];
const _hoisted_10 = { class: "sccp-field" };
const _hoisted_11 = ["value"];
const _hoisted_12 = { class: "sccp-field" };
const _hoisted_13 = { class: "sccp-field" };
const _hoisted_14 = ["placeholder"];
const _hoisted_15 = { key: 0 };
const _hoisted_16 = { class: "sccp-field" };
const _hoisted_17 = { class: "sccp-field" };
const _hoisted_18 = { class: "sccp-actions" };
const _hoisted_19 = ["disabled"];
const _hoisted_20 = {
  class: "sccp-output",
  "aria-live": "polite"
};
const _hoisted_21 = { key: 0 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Sccp",
  setup(__props) {
    const { t } = useTranslation();
    const networkByKey = {
      bsc: {
        key: "bsc",
        name: "Binance Smart Chain",
        symbol: "BSC",
        chainId: "56",
        explorer: "https://bscscan.com",
        note: "Wallet: 0x...",
        supports: ["BEP-20", "ERC-20"],
        addressPattern: /^0x[a-fA-F0-9]{40}$/
      },
      eth: {
        key: "eth",
        name: "Ethereum",
        symbol: "ETH",
        chainId: "1",
        explorer: "https://etherscan.io",
        note: "Wallet: 0x...",
        supports: ["ERC-20"],
        addressPattern: /^0x[a-fA-F0-9]{40}$/
      },
      tron: {
        key: "tron",
        name: "TRON",
        symbol: "TRX",
        chainId: "728126428",
        explorer: "https://tronscan.org",
        note: "Wallet: T...",
        supports: ["TRC-20"],
        addressPattern: /^T[a-zA-Z0-9]{33,}$/
      }
    };
    const networks = Object.values(networkByKey);
    const sourceNetwork = ref(networks[0].key);
    const destinationNetwork = ref(networks[1].key);
    const destinationAddress = ref("");
    const asset = ref("SORA");
    const amount = ref("");
    const memo = ref("");
    const copyState = ref("idle");
    const selectedSource = computed(() => networkByKey[sourceNetwork.value]);
    const selectedDestination = computed(() => networkByKey[destinationNetwork.value]);
    const isDestinationAddressValid = computed(
      () => selectedDestination.value.addressPattern.test(destinationAddress.value || "")
    );
    const amountValue = computed(() => {
      const normalized = Number.parseFloat(amount.value);
      return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
    });
    const canBuildPayload = computed(
      () => sourceNetwork.value !== destinationNetwork.value && Boolean(asset.value.trim()) && amountValue.value !== null && Boolean(destinationAddress.value.trim()) && isDestinationAddressValid.value
    );
    const networkSummary = computed(() => networks.map((item) => item.symbol).join(", "));
    const addressHint = computed(() => selectedDestination.value?.note || "");
    const invalidAddressMessage = computed(() => `Expected ${selectedDestination.value?.name} address format.`);
    const payloadText = computed(
      () => canBuildPayload.value ? JSON.stringify(
        {
          protocol: "SCCP",
          version: "1.0",
          source: {
            chain: selectedSource.value.key,
            chainId: selectedSource.value.chainId,
            explorer: selectedSource.value.explorer
          },
          destination: {
            chain: selectedDestination.value.key,
            chainId: selectedDestination.value.chainId,
            explorer: selectedDestination.value.explorer,
            recipient: destinationAddress.value
          },
          asset: asset.value.toUpperCase(),
          amount: amountValue.value,
          memo: memo.value || void 0,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        null,
        2
      ) : ""
    );
    const copyButtonText = computed(() => {
      if (copyState.value === "copied") {
        return t("sccp.payloadCopied");
      }
      if (copyState.value === "error") {
        return t("sccp.payloadCopyFailed");
      }
      return t("sccp.copyPayload");
    });
    const copyPayload = async () => {
      copyState.value = "idle";
      if (!payloadText.value) {
        return;
      }
      try {
        await navigator.clipboard.writeText(payloadText.value);
        copyState.value = "copied";
      } catch (_err) {
        copyState.value = "error";
      }
    };
    const generatePayload = () => {
      if (!canBuildPayload.value) return;
      copyState.value = "idle";
    };
    const clearForm = () => {
      sourceNetwork.value = networks[0].key;
      destinationNetwork.value = networks[1].key;
      destinationAddress.value = "";
      asset.value = "SORA";
      amount.value = "";
      memo.value = "";
      copyState.value = "idle";
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("section", _hoisted_2, [
          createBaseVNode("header", _hoisted_3, [
            createBaseVNode("h1", _hoisted_4, toDisplayString(unref(t)("sccp.title")), 1),
            createBaseVNode("p", _hoisted_5, toDisplayString(unref(t)("sccp.subtitle")), 1),
            createBaseVNode("p", _hoisted_6, toDisplayString(unref(t)("sccp.supportedNetworks", { chains: networkSummary.value })), 1)
          ]),
          createBaseVNode("div", _hoisted_7, [
            createBaseVNode("label", _hoisted_8, [
              createBaseVNode("span", null, toDisplayString(unref(t)("sccp.sourceNetworkLabel")), 1),
              withDirectives(createBaseVNode("select", {
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => sourceNetwork.value = $event)
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(networks), (network) => {
                  return openBlock(), createElementBlock("option", {
                    key: network.key,
                    value: network.key
                  }, toDisplayString(network.name) + " (" + toDisplayString(network.symbol) + ") ", 9, _hoisted_9);
                }), 128))
              ], 512), [
                [vModelSelect, sourceNetwork.value]
              ])
            ]),
            createBaseVNode("label", _hoisted_10, [
              createBaseVNode("span", null, toDisplayString(unref(t)("sccp.destinationNetworkLabel")), 1),
              withDirectives(createBaseVNode("select", {
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => destinationNetwork.value = $event)
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(networks), (network) => {
                  return openBlock(), createElementBlock("option", {
                    key: network.key,
                    value: network.key
                  }, toDisplayString(network.name) + " (" + toDisplayString(network.symbol) + ") ", 9, _hoisted_11);
                }), 128))
              ], 512), [
                [vModelSelect, destinationNetwork.value]
              ])
            ]),
            createBaseVNode("label", _hoisted_12, [
              createBaseVNode("span", null, toDisplayString(unref(t)("sccp.assetLabel")), 1),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => asset.value = $event),
                type: "text",
                maxlength: "12",
                placeholder: "SORA"
              }, null, 512), [
                [
                  vModelText,
                  asset.value,
                  void 0,
                  { trim: true }
                ]
              ])
            ]),
            createBaseVNode("label", _hoisted_13, [
              createBaseVNode("span", null, toDisplayString(unref(t)("sccp.destinationAddressLabel")), 1),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => destinationAddress.value = $event),
                type: "text",
                placeholder: addressHint.value
              }, null, 8, _hoisted_14), [
                [
                  vModelText,
                  destinationAddress.value,
                  void 0,
                  { trim: true }
                ]
              ]),
              destinationAddress.value && !isDestinationAddressValid.value ? (openBlock(), createElementBlock("small", _hoisted_15, toDisplayString(invalidAddressMessage.value), 1)) : createCommentVNode("", true)
            ]),
            createBaseVNode("label", _hoisted_16, [
              createBaseVNode("span", null, toDisplayString(unref(t)("sccp.amountLabel")), 1),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => amount.value = $event),
                type: "number",
                min: "0",
                step: "0.000001",
                placeholder: "0.0"
              }, null, 512), [
                [
                  vModelText,
                  amount.value,
                  void 0,
                  { trim: true }
                ]
              ])
            ]),
            createBaseVNode("label", _hoisted_17, [
              createBaseVNode("span", null, toDisplayString(unref(t)("sccp.noteLabel")), 1),
              withDirectives(createBaseVNode("input", {
                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => memo.value = $event),
                type: "text",
                placeholder: "optional"
              }, null, 512), [
                [
                  vModelText,
                  memo.value,
                  void 0,
                  { trim: true }
                ]
              ])
            ])
          ]),
          createBaseVNode("div", _hoisted_18, [
            createBaseVNode("button", {
              type: "button",
              disabled: !canBuildPayload.value,
              onClick: generatePayload
            }, toDisplayString(unref(t)("sccp.generatePayload")), 9, _hoisted_19),
            createBaseVNode("button", {
              type: "button",
              class: "sccp-ghost",
              onClick: clearForm
            }, toDisplayString(unref(t)("sccp.clearPayload")), 1)
          ]),
          createBaseVNode("section", _hoisted_20, [
            createBaseVNode("h2", null, toDisplayString(unref(t)("sccp.payloadLabel")), 1),
            !payloadText.value ? (openBlock(), createElementBlock("p", _hoisted_21, toDisplayString(unref(t)("sccp.emptyPayloadHelp")), 1)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              createBaseVNode("pre", null, toDisplayString(payloadText.value), 1),
              createBaseVNode("button", {
                type: "button",
                class: normalizeClass({ "is-success": copyState.value === "copied" }),
                onClick: copyPayload
              }, toDisplayString(copyButtonText.value), 3)
            ], 64))
          ])
        ])
      ]);
    };
  }
});
const Sccp = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-0a8a13f0"]]);
export {
  Sccp as default
};
