import { a9 as ref, aA as watch, z as defineComponent, a_ as resolveComponent, am as createBlock, C as openBlock, as as mergeProps, h as computed, aj as unref, ar as isRef, ao as withCtx, D as createBaseVNode, cd as normalizeStyle, bb as normalizeClass, A as createElementBlock, aM as createCommentVNode, ap as createVNode, aJ as renderSlot, aN as toDisplayString, c0 as toRef } from "./index-73GArslZ.js";
function useDialogVisibility(propVisible, options = {}) {
  const { emit, onClose } = options;
  const isVisible = ref(propVisible.value);
  watch(
    propVisible,
    (value) => {
      if (isVisible.value !== value) {
        isVisible.value = value;
      }
    },
    { immediate: true }
  );
  watch(isVisible, (value, oldValue) => {
    if (value === oldValue) return;
    emit?.(value);
  });
  const setVisible = (value) => {
    isVisible.value = value;
  };
  const closeDialog = () => {
    onClose?.();
    setVisible(false);
  };
  return {
    isVisible,
    setVisible,
    closeDialog
  };
}
const _hoisted_1 = { class: "dialog-card__header" };
const _hoisted_2 = {
  key: 0,
  class: "dialog-card__back"
};
const _hoisted_3 = { class: "dialog-card__title" };
const _hoisted_4 = { class: "dialog-card__title-text" };
const _hoisted_5 = { class: "dialog-card__actions" };
const _hoisted_6 = { class: "dialog-card__content" };
const _hoisted_7 = {
  key: 0,
  class: "dialog-card__footer"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ inheritAttrs: false },
  __name: "DialogBase",
  props: {
    visible: { type: Boolean, default: false },
    customClass: { default: "" },
    wrapperClass: { default: "" },
    title: { default: "" },
    tooltip: { default: "" },
    width: { default: "" },
    showBack: { type: Boolean, default: false },
    showCloseButton: { type: Boolean, default: true }
  },
  emits: ["update:visible", "close", "back"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { isVisible, closeDialog } = useDialogVisibility(toRef(props, "visible"), {
      emit: (value) => emit("update:visible", value),
      onClose: () => emit("close")
    });
    const cardClasses = computed(() => {
      const classes = ["dialog-card", "neumorphic"];
      if (props.customClass) {
        classes.push(props.customClass);
      }
      return classes;
    });
    const flattenClassNames = (value) => {
      if (!value) return [];
      if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
      if (Array.isArray(value)) return value.flatMap((item) => flattenClassNames(item));
      if (typeof value === "object") {
        return Object.entries(value).filter(([, enabled]) => Boolean(enabled)).map(([className]) => className);
      }
      return [];
    };
    const modalClass = computed(() => {
      return ["dialog-wrapper", "dialog-wrapper__modal", ...flattenClassNames(props.wrapperClass)];
    });
    const cardStyle = computed(() => {
      if (!props.width) return void 0;
      return {
        width: props.width,
        maxWidth: "100%"
      };
    });
    const handleBackClick = () => {
      emit("back");
    };
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_modal = resolveComponent("s-modal");
      return openBlock(), createBlock(_component_s_modal, mergeProps({
        show: unref(isVisible),
        "onUpdate:show": _cache[0] || (_cache[0] = ($event) => isRef(isVisible) ? isVisible.value = $event : null),
        "modal-class": modalClass.value,
        "overlay-class": "dialog-wrapper__overlay",
        "lock-scroll": true
      }, _ctx.$attrs), {
        default: withCtx(() => [
          createBaseVNode("div", {
            class: normalizeClass(cardClasses.value),
            style: normalizeStyle(cardStyle.value)
          }, [
            createBaseVNode("header", _hoisted_1, [
              __props.showBack ? (openBlock(), createElementBlock("div", _hoisted_2, [
                createVNode(_component_s_button, {
                  type: "action",
                  size: "sm",
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
              ])) : createCommentVNode("", true),
              createBaseVNode("div", _hoisted_3, [
                renderSlot(_ctx.$slots, "title", {}, () => [
                  createBaseVNode("span", _hoisted_4, toDisplayString(__props.title), 1)
                ]),
                __props.tooltip ? (openBlock(), createBlock(_component_s_tooltip, {
                  key: 0,
                  class: "dialog-card__tooltip",
                  "border-radius": "mini",
                  content: __props.tooltip,
                  placement: "top",
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
              ]),
              createBaseVNode("div", _hoisted_5, [
                renderSlot(_ctx.$slots, "header-actions"),
                __props.showCloseButton ? (openBlock(), createBlock(_component_s_button, {
                  key: 0,
                  class: "dialog-card__close",
                  type: "action",
                  size: "sm",
                  onClick: unref(closeDialog)
                }, {
                  default: withCtx(() => [
                    createVNode(_component_s_icon, {
                      name: "basic-close-24",
                      size: "28"
                    })
                  ]),
                  _: 1
                }, 8, ["onClick"])) : createCommentVNode("", true)
              ])
            ]),
            createBaseVNode("div", _hoisted_6, [
              renderSlot(_ctx.$slots, "default")
            ]),
            _ctx.$slots.footer ? (openBlock(), createElementBlock("footer", _hoisted_7, [
              renderSlot(_ctx.$slots, "footer")
            ])) : createCommentVNode("", true)
          ], 6)
        ]),
        _: 3
      }, 16, ["show", "modal-class"]);
    };
  }
});
export {
  _sfc_main as _,
  useDialogVisibility as u
};
