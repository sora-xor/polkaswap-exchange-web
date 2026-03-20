import { z as defineComponent, aZ as components, u as useTranslation, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, aM as createCommentVNode, bb as normalizeClass, aN as toDisplayString, h as computed, aj as unref, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "status-badge-logo" };
const _hoisted_2 = { class: "status-badge-title" };
const _hoisted_3 = {
  key: 0,
  class: "status-badge-title--mini"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "StatusBadge",
    components: {
      TokenLogo: components.TokenLogo
    }
  },
  __name: "StatusBadge",
  props: {
    stopped: { type: Boolean },
    active: { type: Boolean },
    apr: {},
    rewardAsset: {}
  },
  setup(__props) {
    const props = __props;
    const { t, TranslationConsts } = useTranslation();
    const aprAvailable = computed(() => props.apr.trim().length > 0);
    const title = computed(() => {
      if (props.stopped) return t("demeterFarming.staking.stopped");
      return props.active ? t("demeterFarming.staking.active") : t("demeterFarming.actions.start");
    });
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["status-badge", { active: __props.active }])
      }, [
        createBaseVNode("div", _hoisted_1, [
          createVNode(_component_token_logo, {
            token: __props.rewardAsset,
            size: "mini"
          }, null, 8, ["token"]),
          __props.active ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass(["status-badge-logo-icon", { active: !__props.stopped }])
          }, null, 2)) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", null, toDisplayString(title.value), 1),
          aprAvailable.value ? (openBlock(), createElementBlock("div", _hoisted_3, toDisplayString(__props.apr) + " " + toDisplayString(unref(TranslationConsts).APR), 1)) : createCommentVNode("", true)
        ])
      ], 2);
    };
  }
});
const StatusBadge = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b4c5beeb"]]);
export {
  StatusBadge as default
};
