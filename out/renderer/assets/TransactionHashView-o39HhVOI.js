import { u as useCopyAddress } from "./useCopyAddress-CJeOU9NK.js";
import { z as defineComponent, u as useTranslation, r as requireLegacyStore, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, am as createBlock, aM as createCommentVNode, h as computed, aj as unref, bb as normalizeClass, ao as withCtx, aO as createTextVNode, aN as toDisplayString, bQ as Fragment, bP as renderList, cJ as HashType, cK as formatAccountAddress, cL as getExplorerLinks, cM as ExplorerType, cN as getSorametricsTransactionLink, cO as getSorametricsBlockLink, cP as getSorametricsAccountLink, cQ as formatAddress, cR as SoraNetwork, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "s-input-container" };
const _hoisted_2 = ["href"];
const _hoisted_3 = ["href"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TransactionHashView",
  props: {
    value: {},
    type: {},
    translation: {},
    hash: { default: "" },
    block: { default: "" }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const { t, TranslationConsts } = useTranslation();
    const store = requireLegacyStore();
    const { copyTooltip, handleCopyAddress } = useCopyAddress();
    const soraNetwork = computed(() => store.state.wallet.settings.soraNetwork ?? SoraNetwork.Dev);
    const isEthHash = computed(() => [HashType.EthAccount, HashType.EthTransaction].includes(props.type));
    const formattedValue = computed(() => {
      if (props.type === HashType.Account) {
        return formatAccountAddress(props.value);
      }
      return props.value;
    });
    const displayValue = computed(() => props.hash || formattedValue.value);
    const explorerLinks = computed(() => {
      if (isEthHash.value) return [];
      const baseLinks = getExplorerLinks(soraNetwork.value);
      if (!baseLinks.length) return [];
      switch (props.type) {
        case HashType.Account:
          return baseLinks.filter(({ type }) => type !== ExplorerType.Polkadot).map(({ type, value }) => ({
            type,
            value: type === ExplorerType.Sorametrics ? getSorametricsAccountLink(formattedValue.value) : `${value}/${props.type}/${formattedValue.value}`
          }));
        case HashType.Block:
          return baseLinks.map(({ type, value }) => {
            const link = { type, value: "" };
            if (type === ExplorerType.Polkadot) {
              link.value = `${value}/${formattedValue.value}`;
            } else if (type === ExplorerType.Sorametrics) {
              link.value = getSorametricsBlockLink(formattedValue.value);
            } else {
              link.value = `${value}/${props.type}/${formattedValue.value}`;
            }
            return link;
          });
        case HashType.ID:
          return baseLinks.map(({ type, value }) => {
            const link = { type, value: "" };
            if (type === ExplorerType.Sorametrics) {
              link.value = getSorametricsTransactionLink(props.value);
            } else if (type === ExplorerType.Sorascan) {
              link.value = `${value}/transaction/${props.value}`;
            } else if (type === ExplorerType.Subscan) {
              if (props.value.startsWith("0x")) {
                link.value = `${value}/extrinsic/${props.value}`;
              }
            } else if (props.block) {
              link.value = `${value}/${props.block}`;
            }
            return link;
          }).filter((entry) => Boolean(entry.value));
        default:
          return [];
      }
    });
    const hasExplorerLinks = computed(() => isEthHash.value || explorerLinks.value.length > 0);
    const formattedAddress = computed(() => formatAddress(displayValue.value, 24));
    const etherscanLink = computed(() => {
      const path = props.type === HashType.EthAccount ? "address" : "tx";
      const base = soraNetwork.value !== SoraNetwork.Prod ? "sepolia." : "";
      return `https://${base}etherscan.io/${path}/${props.value}`;
    });
    const getExplorerTranslation = (type) => {
      switch (type) {
        case ExplorerType.Polkadot:
          return TranslationConsts.Polkadot;
        case ExplorerType.Sorascan:
          return TranslationConsts.SORAScan;
        case ExplorerType.Sorametrics:
          return TranslationConsts.SoraMetrics;
        case ExplorerType.Subscan:
          return TranslationConsts.Subscan;
        default:
          return "";
      }
    };
    const handleOpenEtherscan = () => {
      const win = window.open(etherscanLink.value, "_blank", "noopener,noreferrer");
      if (win) {
        win.opener = null;
        win.focus();
      }
    };
    __expose({
      handleCopyAddress,
      copyTooltip,
      getExplorerTranslation,
      handleOpenEtherscan
    });
    return (_ctx, _cache) => {
      const _component_s_input = resolveComponent("s-input");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_dropdown_item = resolveComponent("s-dropdown-item");
      const _component_s_dropdown = resolveComponent("s-dropdown");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_input, {
          placeholder: unref(t)(__props.translation),
          value: formattedAddress.value,
          readonly: "",
          tabindex: "-1"
        }, null, 8, ["placeholder", "value"]),
        createVNode(_component_s_button, {
          class: normalizeClass(["s-button--copy", { "with-dropdown": hasExplorerLinks.value }]),
          icon: "basic-copy-24",
          tooltip: unref(copyTooltip)(unref(t)(__props.translation)),
          type: "action",
          alternative: "",
          onClick: _cache[0] || (_cache[0] = ($event) => unref(handleCopyAddress)(formattedValue.value, $event))
        }, null, 8, ["class", "tooltip"]),
        hasExplorerLinks.value ? (openBlock(), createBlock(_component_s_dropdown, {
          key: 0,
          class: "s-dropdown-menu",
          "border-radius": "mini",
          type: "ellipsis",
          icon: "basic-more-vertical-24",
          placement: "bottom-end",
          onSelect: _cache[1] || (_cache[1] = ($event) => isEthHash.value ? handleOpenEtherscan() : void 0)
        }, {
          menu: withCtx(() => [
            isEthHash.value ? (openBlock(), createElementBlock("a", {
              key: 0,
              class: "transaction-link",
              href: etherscanLink.value,
              target: "_blank",
              rel: "nofollow noopener"
            }, [
              createVNode(_component_s_dropdown_item, { class: "s-dropdown-menu__item" }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(unref(t)("transaction.viewIn", { explorer: unref(TranslationConsts).Etherscan })), 1)
                ]),
                _: 1
              })
            ], 8, _hoisted_2)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(explorerLinks.value, (link) => {
              return openBlock(), createElementBlock("a", {
                key: link.type,
                class: "transaction-link",
                href: link.value,
                target: "_blank",
                rel: "nofollow noopener"
              }, [
                createVNode(_component_s_dropdown_item, { class: "s-dropdown-menu__item" }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(t)("transaction.viewIn", { explorer: getExplorerTranslation(link.type) })), 1)
                  ]),
                  _: 2
                }, 1024)
              ], 8, _hoisted_3);
            }), 128))
          ]),
          _: 1
        })) : createCommentVNode("", true)
      ]);
    };
  }
});
const TransactionHashView = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1948226f"]]);
export {
  TransactionHashView as default
};
