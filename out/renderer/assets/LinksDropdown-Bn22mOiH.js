import { z as defineComponent, u as useTranslation, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, bQ as Fragment, bP as renderList, ap as createVNode, aO as createTextVNode, aN as toDisplayString, aj as unref, t as toSafeExternalLink, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = ["href"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "LinksDropdown",
  props: {
    links: { default: () => [] }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const { t } = useTranslation();
    const explorerLabels = {
      etherscan: "Etherscan",
      polkadot: "Polkadot",
      sorametrics: "SoraMetrics",
      sorascan: "SORAScan",
      subscan: "Subscan"
    };
    const links = computed(
      () => props.links.reduce((result, link) => {
        const href = toSafeExternalLink(link?.value);
        if (href) {
          result.push({ ...link, value: href });
        }
        return result;
      }, [])
    );
    const getExplorerLabel = (type) => explorerLabels[type.toLowerCase()] ?? type;
    __expose({
      getExplorerLabel,
      links
    });
    return (_ctx, _cache) => {
      const _component_s_dropdown_item = resolveComponent("s-dropdown-item");
      const _component_s_dropdown = resolveComponent("s-dropdown");
      return openBlock(), createBlock(_component_s_dropdown, {
        class: "s-dropdown--hash-menu",
        "border-radius": "mini",
        type: "ellipsis",
        icon: "basic-more-vertical-24",
        placement: "bottom-end"
      }, {
        menu: withCtx(() => [
          (openBlock(true), createElementBlock(Fragment, null, renderList(links.value, (link) => {
            return openBlock(), createElementBlock("a", {
              key: link.type,
              href: link.value,
              class: "transaction-link",
              target: "_blank",
              rel: "nofollow noopener"
            }, [
              createVNode(_component_s_dropdown_item, { class: "s-dropdown-menu__item" }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(unref(t)("transaction.viewIn", { explorer: getExplorerLabel(link.type) })), 1)
                ]),
                _: 2
              }, 1024)
            ], 8, _hoisted_1);
          }), 128))
        ]),
        _: 1
      });
    };
  }
});
const LinksDropdown = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-221641e4"]]);
export {
  LinksDropdown as default
};
