import { I as InputFocusMixin } from "./InputFocusMixin-CmEfEypi.js";
import { z as defineComponent, aP as _export_sfc, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, bA as withDirectives, ap as createVNode, bB as vShow, as as mergeProps } from "./index-73GArslZ.js";
const _sfc_main = defineComponent({
  inheritAttrs: false,
  mixins: [InputFocusMixin],
  props: {
    modelValue: {
      type: String,
      default: ""
    }
  },
  emits: ["update:modelValue", "clear"],
  computed: {
    query: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit("update:modelValue", value);
      }
    }
  },
  methods: {
    handleClearSearch() {
      this.$emit("clear");
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_button = resolveComponent("s-button");
  const _component_s_input = resolveComponent("s-input");
  return openBlock(), createBlock(_component_s_input, mergeProps({
    ref: "input",
    modelValue: _ctx.query,
    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.query = $event),
    class: "search-input",
    prefix: "s-icon-search-16",
    size: "big"
  }, _ctx.$attrs), {
    suffix: withCtx(() => [
      withDirectives(createVNode(_component_s_button, {
        type: "link",
        class: "s-button--clear",
        icon: "clear-X-16",
        onClick: _ctx.handleClearSearch
      }, null, 8, ["onClick"]), [
        [vShow, _ctx.query]
      ])
    ]),
    _: 1
  }, 16, ["modelValue"]);
}
const SearchInput = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  SearchInput as default
};
