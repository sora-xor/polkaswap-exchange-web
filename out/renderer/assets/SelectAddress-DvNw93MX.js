import { z as defineComponent, bt as mergeModels, aZ as components, bu as useModel, u as useTranslation, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, h as computed, ao as withCtx, aO as createTextVNode, aN as toDisplayString, aj as unref, ay as api, a9 as ref, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "select-address" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      AddressBookInput: components.AddressBookInput
    }
  },
  __name: "SelectAddress",
  props: {
    "value": { default: "" },
    "valueModifiers": {}
  },
  emits: /* @__PURE__ */ mergeModels(["select"], ["update:value"]),
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const address = useModel(__props, "value");
    const { t } = useTranslation();
    const name = ref("");
    const validAddress = computed(() => api.validateAddress(address.value));
    function handleSelectAddress() {
      emit("select", { address: address.value, name: name.value });
    }
    function updateName(newName) {
      name.value = newName;
    }
    return (_ctx, _cache) => {
      const _component_address_book_input = resolveComponent("address-book-input");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_address_book_input, {
          ref: "input",
          modelValue: address.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => address.value = $event),
          "is-valid": validAddress.value,
          onUpdateName: updateName
        }, null, 8, ["modelValue", "is-valid"]),
        createVNode(_component_s_button, {
          class: "s-typography-button--large select-address-button",
          type: "primary",
          disabled: !validAddress.value,
          onClick: handleSelectAddress
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("saveText")), 1)
          ]),
          _: 1
        }, 8, ["disabled"])
      ]);
    };
  }
});
const SelectAddress = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-6907773f"]]);
export {
  SelectAddress as default
};
