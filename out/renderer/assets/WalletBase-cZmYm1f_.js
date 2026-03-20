import { z as defineComponent, u as useTranslation, aA as watch, a9 as ref, a4 as onMounted, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, aJ as renderSlot, D as createBaseVNode, bb as normalizeClass, h as computed, A as createElementBlock, aM as createCommentVNode, ap as createVNode, aO as createTextVNode, aN as toDisplayString, aj as unref, as as mergeProps, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = ["tabindex"];
const _hoisted_2 = {
  key: 1,
  class: "base-title_text"
};
const _hoisted_3 = { class: "base-title_action" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "WalletBase",
  props: {
    title: { default: "" },
    tooltip: { default: "" },
    titleCenter: { type: Boolean, default: false },
    showBack: { type: Boolean, default: false },
    showClose: { type: Boolean, default: false },
    showHeader: { type: Boolean, default: true },
    resetFocus: { default: "" }
  },
  emits: ["back", "close"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const headerBase = ref(null);
    const hasFocusReset = ref(false);
    const setFocusToHeader = () => {
      const element = headerBase.value;
      if (!element) return;
      element.focus();
      element.blur();
    };
    watch(
      () => props.resetFocus,
      (value) => {
        if (value) {
          hasFocusReset.value = true;
          setFocusToHeader();
          hasFocusReset.value = false;
        }
      }
    );
    const headerClasses = computed(() => {
      const classes = ["base-title", "s-flex"];
      if (props.showBack || props.titleCenter) {
        classes.push("base-title--center");
      }
      if (props.showClose) {
        classes.push("base-title--actions");
      }
      return classes;
    });
    const backButtonClass = computed(() => {
      const base = ["base-title_back"];
      if (!props.showBack) base.push("base-title_back--hidden");
      return base;
    });
    const handleBackClick = () => {
      emit("back");
    };
    const handleCloseClick = () => {
      emit("close");
    };
    onMounted(() => {
      setFocusToHeader();
    });
    __expose({
      setFocusToHeader
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_card = resolveComponent("s-card");
      return openBlock(), createBlock(_component_s_card, mergeProps({
        primary: true,
        borderRadius: "medium",
        shadow: "always",
        size: "big",
        ..._ctx.$attrs
      }, { class: "base" }), {
        header: withCtx(() => [
          createBaseVNode("div", {
            ref_key: "headerBase",
            ref: headerBase,
            class: normalizeClass(headerClasses.value),
            tabindex: hasFocusReset.value ? 0 : -1
          }, [
            __props.showBack ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: normalizeClass(backButtonClass.value)
            }, [
              createVNode(_component_s_button, {
                type: "action",
                onClick: handleBackClick
              }, {
                default: withCtx(() => [
                  createVNode(_component_s_icon, {
                    name: "arrows-chevron-left-rounded-24",
                    size: "28"
                  })
                ]),
                _: 1
              })
            ], 2)) : createCommentVNode("", true),
            __props.showHeader ? (openBlock(), createElementBlock("h3", _hoisted_2, [
              createTextVNode(toDisplayString(__props.title) + " ", 1),
              __props.tooltip ? (openBlock(), createBlock(_component_s_tooltip, {
                key: 0,
                class: "base-title_tooltip",
                "popper-class": "info-tooltip base-title_tooltip-popper",
                "border-radius": "mini",
                content: __props.tooltip,
                placement: "right",
                tabindex: "-1"
              }, {
                default: withCtx(() => [
                  createVNode(_component_s_icon, {
                    name: "info-16",
                    size: "18px"
                  })
                ]),
                _: 1
              }, 8, ["content"])) : createCommentVNode("", true)
            ])) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_3, [
              renderSlot(_ctx.$slots, "actions", {}, void 0, true)
            ]),
            __props.showClose ? (openBlock(), createBlock(_component_s_button, {
              key: 2,
              class: "base-title_close",
              type: "action",
              rounded: "",
              tooltip: unref(t)("closeText"),
              onClick: handleCloseClick
            }, {
              default: withCtx(() => [
                createVNode(_component_s_icon, {
                  name: "basic-close-24",
                  size: "28"
                })
              ]),
              _: 1
            }, 8, ["tooltip"])) : createCommentVNode("", true)
          ], 10, _hoisted_1)
        ]),
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default", {}, void 0, true)
        ]),
        _: 3
      }, 16);
    };
  }
});
const WalletBase = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-8f018ee7"]]);
export {
  WalletBase as default
};
