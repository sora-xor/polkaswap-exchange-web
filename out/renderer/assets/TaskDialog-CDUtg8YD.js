import { z as defineComponent, bt as mergeModels, aZ as components, bu as useModel, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, aN as toDisplayString, aj as unref, aO as createTextVNode, h as computed, cd as normalizeStyle, ap as createVNode, A as createElementBlock, aP as _export_sfc } from "./index-73GArslZ.js";
import { M as MAX_LEVEL, g as getImageSrc, i as isTokenImage } from "./pointSystem-B9fONsCS.js";
import "./tabs-xjDSPYBb.js";
const _hoisted_1 = { class: "task-dialog__title-progress" };
const _hoisted_2 = { class: "task-dialog__card-progress" };
const _hoisted_3 = { class: "current-level" };
const _hoisted_4 = { class: "progress-container" };
const _hoisted_5 = { class: "next-level" };
const _hoisted_6 = { class: "task-dialog__card-current" };
const _hoisted_7 = { class: "img-title" };
const _hoisted_8 = ["src", "alt"];
const _hoisted_9 = { class: "description" };
const _hoisted_10 = { class: "currently-amount" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      TokenLogo: components.TokenLogo
    }
  },
  __name: "TaskDialog",
  props: /* @__PURE__ */ mergeModels({
    pointsForCategory: {},
    categoryName: {}
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const maxLevel = MAX_LEVEL;
    const getImageSrc$1 = getImageSrc;
    const imageName = computed(() => props.pointsForCategory.imageName);
    const isTokenImage$1 = computed(() => isTokenImage(imageName.value));
    const levelCurrent = computed(() => props.pointsForCategory.levelCurrent);
    const progressPercentage = computed(() => {
      const { minimumAmountForNextLevel, currentProgress } = props.pointsForCategory;
      if (!minimumAmountForNextLevel || minimumAmountForNextLevel === 0) {
        return 0;
      }
      return Math.min(currentProgress / minimumAmountForNextLevel * 100, 100);
    });
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        class: "task-dialog",
        title: unref(t)(`points.${__props.categoryName}.titleProgress`)
      }, {
        default: withCtx(() => [
          createBaseVNode("div", null, [
            createBaseVNode("p", _hoisted_1, toDisplayString(unref(t)("points.relatedTasks", { title: unref(t)(`points.${__props.categoryName}.titleProgress`) })), 1),
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("div", _hoisted_3, [
                createBaseVNode("p", null, toDisplayString(unref(t)("points.yourLevel")), 1),
                createBaseVNode("p", null, [
                  createTextVNode(toDisplayString(unref(t)("points.lvl").toUpperCase()) + " " + toDisplayString(levelCurrent.value) + " ", 1),
                  createBaseVNode("span", null, "/ " + toDisplayString(unref(t)("points.lvl").toUpperCase()) + " " + toDisplayString(unref(maxLevel)), 1)
                ])
              ]),
              createBaseVNode("div", _hoisted_4, [
                createBaseVNode("div", {
                  class: "progress-bar",
                  style: normalizeStyle({ width: progressPercentage.value + "%" })
                }, null, 4)
              ]),
              createBaseVNode("div", _hoisted_5, [
                createBaseVNode("p", null, toDisplayString(unref(t)("points.rewardNextLvl")), 1),
                createBaseVNode("p", null, toDisplayString(__props.pointsForCategory.nextLevelRewardPoints), 1)
              ])
            ]),
            createBaseVNode("div", _hoisted_6, [
              createBaseVNode("div", _hoisted_7, [
                isTokenImage$1.value ? (openBlock(), createBlock(_component_token_logo, {
                  key: 0,
                  token: unref(getImageSrc$1)(imageName.value),
                  size: "small"
                }, null, 8, ["token"])) : (openBlock(), createElementBlock("img", {
                  key: 1,
                  src: unref(getImageSrc$1)(imageName.value),
                  alt: imageName.value
                }, null, 8, _hoisted_8)),
                createBaseVNode("p", null, toDisplayString(unref(t)(`points.${__props.categoryName}.titleTask`)), 1)
              ]),
              createBaseVNode("p", _hoisted_9, toDisplayString(unref(t)(`points.${__props.categoryName}.descriptionTask`)), 1),
              createVNode(_component_s_divider),
              createBaseVNode("p", _hoisted_10, [
                createTextVNode(toDisplayString(unref(t)("points.currently")) + ": ", 1),
                createBaseVNode("span", null, " $" + toDisplayString(__props.pointsForCategory.currentProgress.toFixed(2)), 1)
              ])
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const TaskDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-58c0fde6"]]);
export {
  TaskDialog as default
};
