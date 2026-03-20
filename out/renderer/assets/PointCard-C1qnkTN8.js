import { z as defineComponent, ak as lazyComponent, u as useTranslation, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, h as computed, aO as createTextVNode, aN as toDisplayString, aj as unref, aM as createCommentVNode, bb as normalizeClass, bQ as Fragment, a9 as ref, al as Components, aP as _export_sfc } from "./index-73GArslZ.js";
import { M as MAX_LEVEL } from "./pointSystem-B9fONsCS.js";
import ProgressCard from "./ProgressCard-DmpaonmH.js";
import "./tabs-xjDSPYBb.js";
const _hoisted_1 = { class: "point-card" };
const _hoisted_2 = { class: "point-card__progress" };
const _hoisted_3 = {
  key: 0,
  class: "icontype s-icon-arrows-chevron-right-rounded-24"
};
const _hoisted_4 = { class: "point-card__currently-amount" };
const _hoisted_5 = { class: "point-card__amount-of-points" };
const _hoisted_6 = {
  key: 1,
  class: "max-level"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      TaskDialog: lazyComponent(Components.TaskDialog),
      ProgressCard
    }
  },
  __name: "PointCard",
  props: {
    pointsForCategory: {},
    categoryName: {}
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const isDialogVisible = ref(false);
    const maxLevel = MAX_LEVEL;
    const points = computed(() => props.pointsForCategory);
    const levelCurrent = computed(() => points.value.levelCurrent);
    const minimumAmountForNextLevel = computed(() => points.value.minimumAmountForNextLevel);
    const imageName = computed(() => points.value.imageName);
    const noNextLevel = computed(() => points.value.nextLevelRewardPoints === null);
    const progressPercentage = computed(() => {
      const minimum = minimumAmountForNextLevel.value;
      if (!minimum || minimum === 0) {
        return 0;
      }
      return Math.min(points.value.currentProgress / minimum * 100, 100);
    });
    function handleClick() {
      if (minimumAmountForNextLevel.value) {
        isDialogVisible.value = true;
      }
    }
    return (_ctx, _cache) => {
      const _component_s_divider = resolveComponent("s-divider");
      const _component_task_dialog = resolveComponent("task-dialog");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createVNode(ProgressCard, {
            "image-name": imageName.value,
            "progress-percentage": progressPercentage.value
          }, null, 8, ["image-name", "progress-percentage"]),
          createBaseVNode("p", null, [
            createTextVNode(toDisplayString(unref(t)("points.lvl").toUpperCase()) + " " + toDisplayString(levelCurrent.value) + " ", 1),
            createBaseVNode("span", null, "/ " + toDisplayString(unref(t)("points.lvl").toUpperCase()) + " " + toDisplayString(unref(maxLevel)), 1)
          ])
        ]),
        createBaseVNode("div", {
          class: normalizeClass(["point-card__name", { disabled: noNextLevel.value }]),
          onClick: handleClick
        }, [
          createBaseVNode("p", null, toDisplayString(unref(t)(`points.${__props.categoryName}.titleProgress`)), 1),
          !noNextLevel.value ? (openBlock(), createElementBlock("i", _hoisted_3)) : createCommentVNode("", true)
        ], 2),
        createBaseVNode("div", _hoisted_4, [
          createBaseVNode("p", null, toDisplayString(unref(t)("points.currently")), 1),
          createBaseVNode("p", null, "$" + toDisplayString(__props.pointsForCategory.currentProgress.toFixed(2)), 1)
        ]),
        createVNode(_component_s_divider),
        createBaseVNode("div", _hoisted_5, [
          !noNextLevel.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            createBaseVNode("p", null, toDisplayString(unref(t)("points.nextLvl").toUpperCase()), 1),
            createBaseVNode("p", null, toDisplayString(__props.pointsForCategory.nextLevelRewardPoints), 1)
          ], 64)) : (openBlock(), createElementBlock("p", _hoisted_6, toDisplayString(unref(t)("points.maxLvl")), 1))
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
const PointCard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d2c738cf"]]);
export {
  PointCard as default
};
