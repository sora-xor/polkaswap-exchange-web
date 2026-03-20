import { z as defineComponent, aZ as components, u as useTranslation, c_ as soraStakingLazyComponent, c$ as SoraStakingComponents, a4 as onMounted, dK as emptyValidatorsFilter, aA as watch, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, aM as createCommentVNode, D as createBaseVNode, h as computed, ap as createVNode, ao as withCtx, aN as toDisplayString, aj as unref, a9 as ref, bA as withDirectives, bb as normalizeClass, am as createBlock, bQ as Fragment, bP as renderList, bc as ValidatorsListMode, dL as recommendedValidatorsFilter, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
import { u as useValidatorsFormatting } from "./useValidatorsFormatting-Ay5wVxnl.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "validators" };
const _hoisted_2 = {
  key: 0,
  class: "search-container"
};
const _hoisted_3 = { class: "filters-button-content" };
const _hoisted_4 = { class: "table-header" };
const _hoisted_5 = { class: "table-header-avatar table-header-item" };
const _hoisted_6 = { class: "table-header-name table-header-item" };
const _hoisted_7 = { class: "table-header-info table-header-item" };
const _hoisted_8 = { class: "list" };
const _hoisted_9 = {
  key: 0,
  class: "empty"
};
const _hoisted_10 = { class: "list" };
const _hoisted_11 = {
  key: 0,
  class: "check"
};
const _hoisted_12 = { class: "name-and-address" };
const _hoisted_13 = { class: "name" };
const _hoisted_14 = { class: "info" };
const _hoisted_15 = ["onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    inheritAttrs: false,
    components: {
      FormattedAddress: components.FormattedAddress
    }
  },
  __name: "ValidatorsList",
  props: {
    mode: {},
    selectedValidators: {}
  },
  emits: ["update:selected"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const {
      validators,
      validatorsFilter,
      setShowValidatorsFilterDialog,
      setValidatorsFilter,
      maxNominations,
      stakingInfo
    } = useSoraStaking();
    const { formatName, decodeName, formatCommission, formatReturn } = useValidatorsFormatting();
    const ValidatorAvatar = soraStakingLazyComponent(SoraStakingComponents.ValidatorAvatar);
    const search = ref("");
    const sort = ref(
      "return-desc"
      /* RETURN_DESC */
    );
    const isValidatorModeRecommended = computed(() => props.mode === ValidatorsListMode.RECOMMENDED);
    const selectedValidators = computed(() => props.selectedValidators ?? []);
    const calcSortClass = (base, value, asc, desc) => ({
      [base]: true,
      [`${base}--active`]: value === asc || value === desc,
      [`${base}--asc`]: value === asc,
      [`${base}--desc`]: value === desc
    });
    const sortedValidators = computed(() => {
      const list = [...validators.value ?? []];
      return list.sort((a, b) => {
        switch (sort.value) {
          case "commission-asc":
            return Number(a.commission) - Number(b.commission);
          case "commission-desc":
            return Number(b.commission) - Number(a.commission);
          case "return-asc":
            return Number(a.apy) - Number(b.apy);
          case "return-desc":
            return Number(b.apy) - Number(a.apy);
          default:
            return 0;
        }
      });
    });
    const applyFilter = (list, filter, term = "") => list.filter((validator) => {
      if (filter.hasIdentity && (!validator.identity || !Object.keys(validator.identity.info).length)) return false;
      if (filter.notSlashed && validator.blocked) return false;
      if (filter.notOversubscribed && validator.isOversubscribed) return false;
      if (filter.twoValidatorsPerIdentity && validator.isOversubscribed) {
        const sameIdentity = list.filter((item) => item.identity?.info.display === validator.identity?.info.display);
        if (sameIdentity.length > 2) return false;
      }
      const name = decodeName(validator);
      return name.toLowerCase().includes(term.toLowerCase());
    });
    const filteredValidators = computed(() => {
      const currentList = sortedValidators.value;
      const baseFilter = validatorsFilter.value ?? emptyValidatorsFilter;
      switch (props.mode) {
        case ValidatorsListMode.RECOMMENDED:
          return applyFilter(currentList, recommendedValidatorsFilter).slice(0, maxNominations.value ?? currentList.length);
        case ValidatorsListMode.USER:
          return applyFilter(currentList, baseFilter, search.value).filter(
            (validator) => stakingInfo.value?.myValidators.includes(validator.address)
          );
        default:
          return applyFilter(currentList, baseFilter, search.value);
      }
    });
    const emptyText = computed(() => {
      if (props.mode === ValidatorsListMode.USER && (stakingInfo.value?.myValidators.length ?? 0) === 0) {
        return t("soraStaking.validatorsList.noNominatedValidators");
      }
      return t("soraStaking.validatorsList.noValidators");
    });
    const commissionHeaderClass = computed(
      () => calcSortClass(
        "table-header-commission",
        sort.value,
        "commission-asc",
        "commission-desc"
        /* COMMISSION_DESC */
      )
    );
    const returnHeaderClass = computed(
      () => calcSortClass(
        "table-header-return",
        sort.value,
        "return-asc",
        "return-desc"
        /* RETURN_DESC */
      )
    );
    const commissionClass = computed(
      () => calcSortClass(
        "info-commission",
        sort.value,
        "commission-asc",
        "commission-desc"
        /* COMMISSION_DESC */
      )
    );
    const returnClass = computed(() => calcSortClass(
      "info-return",
      sort.value,
      "return-asc",
      "return-desc"
      /* RETURN_DESC */
    ));
    const setCommissionSort = () => {
      sort.value = sort.value === "commission-asc" ? "commission-desc" : sort.value === "commission-desc" ? "commission-asc" : "commission-asc";
    };
    const setReturnSort = () => {
      sort.value = sort.value === "return-asc" ? "return-desc" : "return-asc";
    };
    const toggleSelectValidator = (validator) => {
      if (isValidatorModeRecommended.value) return;
      const selected = [...selectedValidators.value];
      const index = selected.findIndex((item) => item.address === validator.address);
      if (index > -1) {
        selected.splice(index, 1);
      } else {
        selected.push(validator);
      }
      emit("update:selected", selected);
    };
    const isSelected = (validator) => selectedValidators.value.some((item) => item.address === validator.address);
    const openFilters = () => {
      setShowValidatorsFilterDialog(true);
    };
    onMounted(() => {
      setValidatorsFilter(emptyValidatorsFilter);
    });
    watch(
      () => [filteredValidators.value, props.mode],
      () => {
        if (isValidatorModeRecommended.value) {
          emit("update:selected", filteredValidators.value);
        }
      },
      { immediate: true }
    );
    __expose({
      toggleSelectValidator,
      setCommissionSort,
      setReturnSort,
      openFilters
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_input = resolveComponent("s-input");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_FormattedAddress = resolveComponent("FormattedAddress");
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      const _directive_button = resolveDirective("button");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        !isValidatorModeRecommended.value ? (openBlock(), createElementBlock("div", _hoisted_2, [
          createVNode(_component_s_input, {
            modelValue: search.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => search.value = $event),
            type: "text",
            placeholder: unref(t)("soraStaking.validatorsList.search"),
            prefix: "s-icon-basic-search-24"
          }, {
            right: withCtx(() => [
              createVNode(_component_s_button, {
                class: "filters-button",
                type: "outline",
                size: "mini",
                onClick: openFilters
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_3, [
                    createBaseVNode("span", null, toDisplayString(unref(t)("soraStaking.validatorsFilterDialog.title")), 1),
                    createVNode(_component_s_icon, {
                      name: "basic-settings-24",
                      size: "14px"
                    })
                  ])
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["modelValue", "placeholder"])
        ])) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_4, [
          createBaseVNode("div", _hoisted_5, [
            createVNode(_component_s_icon, {
              name: "various-bone-24",
              size: "14px"
            })
          ]),
          createBaseVNode("div", _hoisted_6, toDisplayString(unref(t)("soraStaking.validatorsList.name")), 1),
          createBaseVNode("div", _hoisted_7, [
            withDirectives((openBlock(), createElementBlock("div", {
              class: normalizeClass(commissionHeaderClass.value),
              onClick: setCommissionSort
            }, [
              createBaseVNode("span", null, toDisplayString(unref(t)("soraStaking.validatorsList.commission")), 1),
              createVNode(_component_s_tooltip, {
                "border-radius": "mini",
                content: unref(t)("soraStaking.validatorsList.commissionTooltip")
              }, {
                default: withCtx(() => [
                  createVNode(_component_s_icon, {
                    name: "info-16",
                    size: "14px"
                  })
                ]),
                _: 1
              }, 8, ["content"]),
              createVNode(_component_s_icon, {
                class: "chevron",
                name: "arrows-chevron-top-rounded-24",
                size: "18"
              })
            ], 2)), [
              [_directive_button]
            ]),
            withDirectives((openBlock(), createElementBlock("div", {
              class: normalizeClass(returnHeaderClass.value),
              onClick: setReturnSort
            }, [
              createBaseVNode("span", null, toDisplayString(unref(t)("soraStaking.validatorsList.return")), 1),
              createVNode(_component_s_tooltip, {
                "border-radius": "mini",
                content: unref(t)("comingSoonText")
              }, {
                default: withCtx(() => [
                  createVNode(_component_s_icon, {
                    name: "info-16",
                    size: "14px"
                  })
                ]),
                _: 1
              }, 8, ["content"]),
              createVNode(_component_s_icon, {
                class: "chevron",
                name: "arrows-chevron-top-rounded-24",
                size: "18"
              })
            ], 2)), [
              [_directive_button]
            ])
          ])
        ]),
        createBaseVNode("div", _hoisted_8, [
          !filteredValidators.value.length ? (openBlock(), createElementBlock("div", _hoisted_9, [
            createBaseVNode("span", null, toDisplayString(emptyText.value), 1)
          ])) : (openBlock(), createBlock(_component_s_scrollbar, {
            key: 1,
            class: "validators-list-scrollbar"
          }, {
            default: withCtx(() => [
              createBaseVNode("ul", _hoisted_10, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(filteredValidators.value, (validator) => {
                  return openBlock(), createElementBlock("li", {
                    key: validator.address,
                    class: "validator"
                  }, [
                    createVNode(unref(ValidatorAvatar), {
                      class: "avatar",
                      validator
                    }, {
                      icon: withCtx(() => [
                        isSelected(validator) ? (openBlock(), createElementBlock("div", _hoisted_11, [
                          createVNode(_component_s_icon, {
                            name: "basic-check-mark-24",
                            size: "12px"
                          })
                        ])) : createCommentVNode("", true)
                      ]),
                      _: 2
                    }, 1032, ["validator"]),
                    createBaseVNode("div", _hoisted_12, [
                      createBaseVNode("div", _hoisted_13, toDisplayString(unref(formatName)(validator)), 1),
                      createVNode(_component_FormattedAddress, {
                        value: validator.address,
                        symbols: 16
                      }, null, 8, ["value"])
                    ]),
                    createBaseVNode("div", _hoisted_14, [
                      createBaseVNode("span", {
                        class: normalizeClass(commissionClass.value)
                      }, toDisplayString(unref(formatCommission)(validator.commission)) + "%", 3),
                      _cache[1] || (_cache[1] = createBaseVNode("br", null, null, -1)),
                      createBaseVNode("span", {
                        class: normalizeClass(returnClass.value)
                      }, toDisplayString(unref(formatReturn)(validator.apy)) + "%", 3)
                    ]),
                    __props.mode === unref(ValidatorsListMode).SELECT ? withDirectives((openBlock(), createElementBlock("div", {
                      key: 0,
                      class: "select-area",
                      onClick: ($event) => toggleSelectValidator(validator)
                    }, null, 8, _hoisted_15)), [
                      [_directive_button]
                    ]) : createCommentVNode("", true)
                  ]);
                }), 128))
              ])
            ]),
            _: 1
          }))
        ]),
        _cache[2] || (_cache[2] = createBaseVNode("div", { class: "blackout" }, null, -1))
      ]);
    };
  }
});
const ValidatorsList = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-92da5694"]]);
export {
  ValidatorsList as default
};
