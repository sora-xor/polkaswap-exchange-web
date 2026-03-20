import { z as defineComponent, bt as mergeModels, bu as useModel, u as useTranslation, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, D as createBaseVNode, aJ as renderSlot, aN as toDisplayString, aj as unref, bQ as Fragment, bP as renderList, h as computed, as as mergeProps, aq as withModifiers, ce as capitalize, cx as isEmpty, aP as _export_sfc } from "./index-73GArslZ.js";
import BaseWidget from "./Base-QFob0qUB.js";
const _hoisted_1 = { class: "customise" };
const _hoisted_2 = { class: "customise-title" };
const _hoisted_3 = ["onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Customise",
  props: /* @__PURE__ */ mergeModels({
    labels: { default: () => ({}) }
  }, {
    "modelValue": { type: Boolean, ...{ default: false } },
    "modelModifiers": {},
    "widgets": {
      default: () => ({})
    },
    "widgetsModifiers": {},
    "options": {
      default: () => ({})
    },
    "optionsModifiers": {}
  }),
  emits: ["update:modelValue", "update:widgets", "update:options"],
  setup(__props) {
    const visible = useModel(__props, "modelValue");
    const widgetsModel = useModel(__props, "widgets");
    const optionsModel = useModel(__props, "options");
    const props = __props;
    const { t } = useTranslation();
    const modelEntries = computed(() => {
      const entries = [];
      const sources = {
        widgets: widgetsModel.value,
        options: optionsModel.value
      };
      Object.keys(sources).forEach((name) => {
        const model = sources[name];
        if (model && !isEmpty(model)) {
          entries.push({ name, model });
        }
      });
      return entries;
    });
    function toggle(name, key, value) {
      const target = name === "widgets" ? widgetsModel : optionsModel;
      if (Boolean(target.value?.[key]) === Boolean(value)) return;
      const nextValue = {
        ...target.value ?? {},
        [key]: value
      };
      target.value = nextValue;
    }
    function toggleLabel(name, key, value) {
      toggle(name, key, !value);
    }
    function getLabel(key) {
      const label = props.labels?.[key] ?? "";
      return capitalize(label);
    }
    function toggleVisibility(event) {
      const target = event.target;
      if (target?.closest("#customise-button")) return;
      visible.value = !visible.value;
    }
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_s_switch = resolveComponent("s-switch");
      const _component_s_popover_panel = resolveComponent("s-popover-panel");
      return openBlock(), createElementBlock("div", {
        class: "customise-widget-wrapper",
        onClick: withModifiers(toggleVisibility, ["stop"])
      }, [
        createVNode(BaseWidget, mergeProps(_ctx.$attrs, {
          title: unref(t)("customisePageText"),
          class: "customise-widget"
        }), {
          filters: withCtx(() => [
            createVNode(_component_s_popover_panel, {
              "popper-class": "customise-widget-popper",
              placement: "bottom-end",
              trigger: "click",
              show: visible.value,
              "onUpdate:show": _cache[0] || (_cache[0] = ($event) => visible.value = $event),
              "visible-arrow": false
            }, {
              reference: withCtx(() => [
                createVNode(_component_s_button, {
                  id: "customise-button",
                  type: "action",
                  alternative: "",
                  size: "small",
                  icon: "basic-settings-24"
                })
              ]),
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_1, [
                  createBaseVNode("div", _hoisted_2, toDisplayString(unref(t)("customisePageText")), 1),
                  (openBlock(true), createElementBlock(Fragment, null, renderList(modelEntries.value, (entry) => {
                    return openBlock(), createElementBlock("div", {
                      key: entry.name,
                      class: "customise-options"
                    }, [
                      createVNode(_component_s_divider),
                      (openBlock(true), createElementBlock(Fragment, null, renderList(entry.model, (value, key) => {
                        return openBlock(), createElementBlock("div", {
                          key,
                          class: "customise-option"
                        }, [
                          createVNode(_component_s_switch, {
                            "model-value": value,
                            "onUpdate:modelValue": (val) => toggle(entry.name, key, val),
                            onChange: (val) => toggle(entry.name, key, val)
                          }, null, 8, ["model-value", "onUpdate:modelValue", "onChange"]),
                          createBaseVNode("button", {
                            type: "button",
                            class: "customise-option__label",
                            onClick: ($event) => toggleLabel(entry.name, key, value)
                          }, toDisplayString(getLabel(key)), 9, _hoisted_3)
                        ]);
                      }), 128))
                    ]);
                  }), 128)),
                  renderSlot(_ctx.$slots, "default", {}, void 0, true)
                ])
              ]),
              _: 3
            }, 8, ["show"])
          ]),
          _: 3
        }, 16, ["title"])
      ]);
    };
  }
});
const CustomiseWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b799fd24"]]);
export {
  CustomiseWidget as default
};
