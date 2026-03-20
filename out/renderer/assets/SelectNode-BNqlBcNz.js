import { z as defineComponent, bt as mergeModels, bm as toRefs, u as useTranslation, bu as useModel, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, bQ as Fragment, bP as renderList, am as createBlock, aj as unref, D as createBaseVNode, aN as toDisplayString, aM as createCommentVNode, aq as withModifiers, aO as createTextVNode, dl as formatLocation, dm as escapeHtml, b2 as sanitizeHtml, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "select-node s-flex" };
const _hoisted_2 = { class: "select-node-item s-flex" };
const _hoisted_3 = { class: "select-node-info s-flex" };
const _hoisted_4 = { class: "select-node-info__label" };
const _hoisted_5 = { class: "select-node-info__desc s-flex" };
const _hoisted_6 = ["innerHTML"];
const _hoisted_7 = { class: "select-node-badge" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SelectNode",
  props: /* @__PURE__ */ mergeModels({
    nodes: { default: () => [] },
    handleNode: { type: Function, default: void 0 },
    viewNode: { type: Function, default: void 0 },
    nodeAddressConnecting: { default: "" },
    disabled: { type: Boolean, default: false }
  }, {
    "value": { default: "" },
    "valueModifiers": {}
  }),
  emits: ["update:value"],
  setup(__props) {
    const props = __props;
    const { nodes, nodeAddressConnecting, disabled } = toRefs(props);
    const { t } = useTranslation();
    const currentAddressValue = useModel(__props, "value");
    function formatNodeLocation(code) {
      const location = formatLocation(code);
      if (!location) return "";
      const safeFlag = `<span class="flag-emodji">${escapeHtml(location.flag)}</span>`;
      const raw = location.name ? `${escapeHtml(location.name)} ${safeFlag}` : safeFlag;
      return sanitizeHtml(raw, {
        allowedTags: ["span"],
        allowedAttributes: {
          span: ["class"]
        }
      });
    }
    function isConnecting(address) {
      return address === nodeAddressConnecting.value;
    }
    function getTitle(node) {
      const { name, chain } = node;
      return name && chain ? t("selectNodeDialog.nodeTitle", { chain, name }) : name || chain || "";
    }
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_radio = resolveComponent("s-radio");
      const _component_s_radio_group = resolveComponent("s-radio-group");
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_scrollbar, { class: "select-node-scrollbar" }, {
          default: withCtx(() => [
            createVNode(_component_s_radio_group, {
              modelValue: currentAddressValue.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => currentAddressValue.value = $event),
              class: "select-node-list s-flex"
            }, {
              default: withCtx(() => [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(nodes), (node) => {
                  return openBlock(), createBlock(_component_s_radio, {
                    key: node.address,
                    label: node.address,
                    value: node.address,
                    disabled: unref(disabled) || isConnecting(node.address),
                    size: "medium",
                    class: "select-node-list__item s-flex"
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_2, [
                        createBaseVNode("div", _hoisted_3, [
                          createBaseVNode("div", _hoisted_4, toDisplayString(getTitle(node)), 1),
                          createBaseVNode("div", _hoisted_5, [
                            createBaseVNode("div", null, toDisplayString(node.address), 1),
                            node.location ? (openBlock(), createElementBlock("div", {
                              key: 0,
                              innerHTML: formatNodeLocation(node.location)
                            }, null, 8, _hoisted_6)) : createCommentVNode("", true)
                          ])
                        ]),
                        createBaseVNode("div", _hoisted_7, [
                          node.address === currentAddressValue.value && !unref(nodeAddressConnecting) ? (openBlock(), createBlock(_component_s_button, {
                            key: 0,
                            class: "select-node-details",
                            type: "action",
                            alternative: "",
                            icon: "arrows-swap-90-24",
                            onClick: withModifiers(($event) => __props.handleNode?.(node), ["stop"])
                          }, null, 8, ["onClick"])) : isConnecting(node.address) ? (openBlock(), createBlock(_component_s_icon, {
                            key: 1,
                            name: "el-icon-loading"
                          })) : createCommentVNode("", true)
                        ]),
                        createVNode(_component_s_button, {
                          class: "select-node-details",
                          type: "action",
                          alternative: "",
                          icon: "arrows-chevron-right-rounded-24",
                          onClick: withModifiers(($event) => __props.viewNode?.(node), ["stop"])
                        }, null, 8, ["onClick"])
                      ])
                    ]),
                    _: 2
                  }, 1032, ["label", "value", "disabled"]);
                }), 128))
              ]),
              _: 1
            }, 8, ["modelValue"])
          ]),
          _: 1
        }),
        createVNode(_component_s_button, {
          class: "select-node-button s-typography-button--big",
          onClick: _cache[1] || (_cache[1] = withModifiers(($event) => __props.viewNode?.(), ["stop"]))
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("selectNodeDialog.addNode")), 1)
          ]),
          _: 1
        })
      ]);
    };
  }
});
const SelectNode = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-de30c263"]]);
export {
  SelectNode as default
};
