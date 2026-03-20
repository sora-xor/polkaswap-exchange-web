import { z as defineComponent, ak as lazyComponent, aZ as components, u as useTranslation, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, am as createBlock, h as computed, aj as unref, aN as toDisplayString, aM as createCommentVNode, aO as createTextVNode, ao as withCtx, bb as normalizeClass, a9 as ref, al as Components, aP as _export_sfc } from "./index-73GArslZ.js";
import { g as getImageSrc, i as isTokenImage } from "./pointSystem-B9fONsCS.js";
import "./tabs-xjDSPYBb.js";
const _hoisted_1 = { class: "task-card" };
const _hoisted_2 = { class: "task-card__title-image" };
const _hoisted_3 = ["src", "alt"];
const _hoisted_4 = { class: "task-card__description-task" };
const _hoisted_5 = { class: "task-card__current-progress" };
const _hoisted_6 = { key: 0 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      FormattedAmount: components.FormattedAmount,
      TokenLogo: components.TokenLogo,
      TaskDialog: lazyComponent(Components.TaskDialog)
    }
  },
  __name: "TaskCard",
  props: {
    pointsForCategory: {},
    categoryName: {}
  },
  setup(__props) {
    const props = __props;
    const { t, tc } = useTranslation();
    const isDialogVisible = ref(false);
    const imageName = computed(() => props.pointsForCategory.imageName);
    const isTokenImage$1 = computed(() => isTokenImage(imageName.value));
    const isCompleted = computed(() => !props.pointsForCategory.minimumAmountForNextLevel);
    function handleButtonClick() {
      if (!isCompleted.value) {
        isDialogVisible.value = true;
      }
    }
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_s_button = resolveComponent("s-button");
      const _component_task_dialog = resolveComponent("task-dialog");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          isTokenImage$1.value ? (openBlock(), createBlock(_component_token_logo, {
            key: 0,
            token: unref(getImageSrc)(imageName.value),
            size: "small"
          }, null, 8, ["token"])) : (openBlock(), createElementBlock("img", {
            key: 1,
            src: unref(getImageSrc)(imageName.value),
            alt: imageName.value
          }, null, 8, _hoisted_3)),
          createBaseVNode("p", null, toDisplayString(unref(t)(`points.${__props.categoryName}.titleProgress`)), 1)
        ]),
        createBaseVNode("p", _hoisted_4, toDisplayString(unref(t)(`points.${__props.categoryName}.descriptionTask`)), 1),
        createBaseVNode("div", null, [
          createVNode(_component_s_divider)
        ]),
        createBaseVNode("div", _hoisted_5, [
          __props.categoryName != "firstTxAccount" ? (openBlock(), createElementBlock("p", _hoisted_6, [
            createTextVNode(toDisplayString(unref(t)("points.currently")) + ": ", 1),
            createBaseVNode("span", null, "$" + toDisplayString(__props.pointsForCategory.currentProgress.toFixed(2)), 1)
          ])) : createCommentVNode("", true),
          createVNode(_component_s_button, {
            class: normalizeClass({ completed: isCompleted.value }),
            onClick: handleButtonClick
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(isCompleted.value ? unref(tc)("points.complete", 1) : unref(tc)("points.complete", 2)), 1)
            ]),
            _: 1
          }, 8, ["class"])
        ]),
        createVNode(_component_task_dialog, {
          visible: isDialogVisible.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isDialogVisible.value = $event),
          "points-for-category": __props.pointsForCategory,
          "category-name": __props.categoryName
        }, null, 8, ["visible", "points-for-category", "category-name"])
      ]);
    };
  }
});
const TaskCard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f7b3c6c4"]]);
export {
  TaskCard as default
};
