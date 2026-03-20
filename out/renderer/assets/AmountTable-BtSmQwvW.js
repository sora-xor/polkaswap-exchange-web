import { z as defineComponent, T as Theme, aZ as components, bm as toRefs, u as useTranslation, h as computed, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, am as createBlock, aM as createCommentVNode, aJ as renderSlot, aN as toDisplayString, aj as unref, ao as withCtx, bQ as Fragment, bP as renderList, ap as createVNode, bb as normalizeClass, aI as WALLET_CONSTS, aO as createTextVNode, ad as asZeroValue, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { _ as _sfc_main$1 } from "./ItemTooltip.vue_vue_type_style_index_0_lang-DwmR9DJW.js";
const _hoisted_1 = { class: "amount-table" };
const _hoisted_2 = { class: "amount-table-title" };
const _hoisted_3 = {
  key: 1,
  class: "amount-table-item__subtitle"
};
const _hoisted_4 = { class: "amount-table-item-content" };
const _hoisted_5 = { class: "amount-table-item-content__header" };
const _hoisted_6 = {
  key: 0,
  class: "amount-table-item-content__body"
};
const _hoisted_7 = { class: "amount-table-subitem__title" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "RewardsAmountTable",
    components: {
      FormattedAmount: components.FormattedAmount,
      FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
      RewardsItemTooltip: _sfc_main$1
    }
  },
  __name: "AmountTable",
  props: {
    items: { default: () => [] },
    title: { default: "" },
    showTable: { type: Boolean, default: true },
    simpleGroup: { type: Boolean, default: false },
    modelValue: { type: [Boolean, Array], default: void 0 },
    isCodecString: { type: Boolean, default: false },
    theme: { default: Theme.LIGHT }
  },
  emits: ["update:modelValue"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const toLimit = (asset, amount, total) => ({
      amount,
      asset,
      total
    });
    const props = __props;
    const emit = __emit;
    const { items, showTable, simpleGroup, isCodecString, theme } = toRefs(props);
    const innerModel = computed({
      get: () => props.modelValue ?? false,
      set: (value) => {
        emit("update:modelValue", value);
      }
    });
    const { t, te } = useTranslation();
    const { formatCodecNumber, getFPNumberFromCodec, getFiatAmountByCodecString, getFiatAmountByString, getFPNumber } = useFormattedAmount();
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const formattedItems = computed(() => items.value.map((item) => formatItem(item)));
    function formatItem(item) {
      const isGroup = "limit" in item && Array.isArray(item.limit);
      const [, rewardEvent] = item.type;
      const key = `rewards.events.${rewardEvent}`;
      const title = te(key) ? t(key) : "";
      const subtitle = "title" in item ? item.title ?? "" : "";
      const total = "total" in item ? item.total : void 0;
      const rewards = isGroup ? item.rewards?.map(formatItem) : [];
      const limit = "limit" in item && Array.isArray(item.limit) ? item.limit : [
        toLimit(
          item.asset,
          item.amount,
          item.total
        )
      ];
      return {
        type: item.type,
        title,
        subtitle,
        limit,
        total,
        rewards
      };
    }
    function isDisabledRewardItem(item) {
      return asZeroValue(item.limit?.[0]?.amount ?? 0);
    }
    __expose({
      formattedItems,
      innerModel,
      isDisabledRewardItem
    });
    return (_ctx, _cache) => {
      const _component_s_divider = resolveComponent("s-divider");
      const _component_formatted_amount_with_fiat_value = resolveComponent("formatted-amount-with-fiat-value");
      const _component_el_checkbox = resolveComponent("el-checkbox");
      const _component_el_checkbox_group = resolveComponent("el-checkbox-group");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, toDisplayString(__props.title), 1),
        unref(showTable) ? (openBlock(), createBlock(_component_el_checkbox_group, {
          key: 0,
          modelValue: innerModel.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => innerModel.value = $event)
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(formattedItems.value, (formatted, index) => {
              return openBlock(), createElementBlock("div", {
                key: index,
                class: "amount-table-item"
              }, [
                index !== 0 ? (openBlock(), createBlock(_component_s_divider, {
                  key: 0,
                  class: normalizeClass(["amount-table-divider", unref(theme)])
                }, null, 8, ["class"])) : createCommentVNode("", true),
                formatted.subtitle ? (openBlock(), createElementBlock("div", _hoisted_3, toDisplayString(formatted.subtitle), 1)) : createCommentVNode("", true),
                createVNode(_component_el_checkbox, {
                  label: formatted.type[1],
                  disabled: isDisabledRewardItem(formatted),
                  size: "big",
                  class: "amount-table-item-group"
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_4, [
                      createBaseVNode("div", _hoisted_5, [
                        (openBlock(true), createElementBlock(Fragment, null, renderList(formatted.limit, (limitItem, index2) => {
                          return openBlock(), createElementBlock("div", {
                            class: "amount-table-item__amount",
                            key: index2
                          }, [
                            createVNode(_component_formatted_amount_with_fiat_value, {
                              "value-class": "amount-table-value",
                              "with-left-shift": "",
                              "value-can-be-hidden": "",
                              value: unref(isCodecString) ? unref(getFPNumberFromCodec)(limitItem.amount, limitItem.asset.decimals).toLocaleString() : limitItem.amount,
                              "font-size-rate": unref(FontSizeRate).MEDIUM,
                              "asset-symbol": limitItem.asset.symbol,
                              "fiat-value": unref(isCodecString) ? unref(getFiatAmountByCodecString)(limitItem.amount, limitItem.asset) : unref(getFiatAmountByString)(limitItem.amount, limitItem.asset),
                              "fiat-font-size-rate": unref(FontSizeRate).MEDIUM
                            }, {
                              default: withCtx(() => [
                                formatted.total && index2 === 0 ? (openBlock(), createBlock(_sfc_main$1, {
                                  key: 0,
                                  value: formatted.total.amount,
                                  asset: formatted.total.asset
                                }, null, 8, ["value", "asset"])) : limitItem.total ? (openBlock(), createBlock(_sfc_main$1, {
                                  key: 1,
                                  value: limitItem.total.amount,
                                  asset: limitItem.total.asset
                                }, null, 8, ["value", "asset"])) : createCommentVNode("", true)
                              ]),
                              _: 2
                            }, 1032, ["value", "font-size-rate", "asset-symbol", "fiat-value", "fiat-font-size-rate"])
                          ]);
                        }), 128))
                      ]),
                      formatted.rewards && formatted.rewards.length !== 0 ? (openBlock(), createElementBlock("div", _hoisted_6, [
                        (openBlock(true), createElementBlock(Fragment, null, renderList(formatted.rewards, (rewardItem, index2) => {
                          return openBlock(), createElementBlock("div", {
                            key: index2,
                            class: "amount-table-subitem"
                          }, [
                            !unref(simpleGroup) || index2 === 0 ? (openBlock(), createBlock(_component_s_divider, {
                              key: 0,
                              class: normalizeClass(["amount-table-divider", unref(theme)])
                            }, null, 8, ["class"])) : createCommentVNode("", true),
                            createBaseVNode("div", _hoisted_7, [
                              unref(simpleGroup) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                                createTextVNode("—")
                              ], 64)) : formatted.total ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                                createTextVNode(toDisplayString(unref(t)("rewards.totalVested")) + " " + toDisplayString(unref(t)("rewards.forText")), 1)
                              ], 64)) : createCommentVNode("", true),
                              createTextVNode(" " + toDisplayString(rewardItem.title), 1)
                            ]),
                            !unref(simpleGroup) && rewardItem.limit ? (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(rewardItem.limit, (limitItem, index3) => {
                              return openBlock(), createElementBlock("div", {
                                key: index3,
                                class: "amount-table-subitem__row"
                              }, [
                                createVNode(_component_formatted_amount_with_fiat_value, {
                                  "value-class": "amount-table-value",
                                  "with-left-shift": "",
                                  "value-can-be-hidden": "",
                                  value: unref(formatCodecNumber)(limitItem.amount),
                                  "font-size-rate": unref(FontSizeRate).MEDIUM,
                                  "asset-symbol": limitItem.asset.symbol,
                                  "fiat-value": unref(getFiatAmountByCodecString)(limitItem.amount, limitItem.asset),
                                  "fiat-font-size-rate": unref(FontSizeRate).MEDIUM
                                }, {
                                  default: withCtx(() => [
                                    limitItem.total ? (openBlock(), createBlock(_sfc_main$1, {
                                      key: 0,
                                      value: limitItem.total,
                                      asset: limitItem.asset
                                    }, null, 8, ["value", "asset"])) : createCommentVNode("", true)
                                  ]),
                                  _: 2
                                }, 1032, ["value", "font-size-rate", "asset-symbol", "fiat-value", "fiat-font-size-rate"])
                              ]);
                            }), 128)) : createCommentVNode("", true)
                          ]);
                        }), 128))
                      ])) : createCommentVNode("", true)
                    ])
                  ]),
                  _: 2
                }, 1032, ["label", "disabled"])
              ]);
            }), 128))
          ]),
          _: 1
        }, 8, ["modelValue"])) : createCommentVNode("", true),
        renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ]);
    };
  }
});
const AmountTable = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2b5993e1"]]);
export {
  AmountTable as default
};
