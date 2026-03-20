import { z as defineComponent, bt as mergeModels, bu as useModel, u as useTranslation, aZ as components, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, A as createElementBlock, bQ as Fragment, bP as renderList, h as computed, aO as createTextVNode, W as router, d0 as SoraStakingPageNames, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "content" };
const _hoisted_2 = { class: "title" };
const _hoisted_3 = { class: "description" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ValidatorsAttentionDialog",
  props: /* @__PURE__ */ mergeModels({
    parentLoading: { type: Boolean },
    isRecommended: { type: Boolean }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "proceed"], ["update:visible"]),
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const DialogBase = components.DialogBase;
    const closeDialog = () => {
      emit("close");
      isVisible.value = false;
    };
    const description = computed(() => {
      const value = t("soraStaking.validatorsAttentionDialog.description");
      return Array.isArray(value) ? value : [];
    });
    const handleConfirm = () => {
      emit("proceed");
      if (props.isRecommended !== false) {
        router.push({ name: SoraStakingPageNames.SelectValidators });
      }
      closeDialog();
    };
    __expose({
      handleConfirm
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event)
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_s_icon, {
              class: "icon",
              name: "notifications-alert-triangle-24",
              size: "64px"
            }),
            createBaseVNode("h1", _hoisted_2, toDisplayString(unref(t)("soraStaking.validatorsAttentionDialog.title")), 1),
            createBaseVNode("div", _hoisted_3, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(description.value, (item) => {
                return openBlock(), createElementBlock("p", { key: item }, toDisplayString(item), 1);
              }), 128))
            ]),
            createVNode(_component_s_button, {
              type: "primary",
              class: "action-button",
              loading: __props.parentLoading,
              onClick: handleConfirm
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("soraStaking.validatorsAttentionDialog.confirm")), 1)
              ]),
              _: 1
            }, 8, ["loading"])
          ])
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});
const ValidatorsAttentionDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-af02ee66"]]);
export {
  ValidatorsAttentionDialog as default
};
