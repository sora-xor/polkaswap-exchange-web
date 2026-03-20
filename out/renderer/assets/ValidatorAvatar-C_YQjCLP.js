import { dJ as toDwebLink, z as defineComponent, aZ as components, h as computed, A as createElementBlock, C as openBlock, am as createBlock, D as createBaseVNode, aj as unref, aJ as renderSlot, aP as _export_sfc } from "./index-73GArslZ.js";
function resolveValidatorAvatarUrl(validator) {
  const url = validator.identity?.info.image;
  if (!url) return null;
  try {
    return toDwebLink(url);
  } catch (error) {
    console.warn("Failed to convert validator avatar url", error);
    return url;
  }
}
const _hoisted_1 = { class: "validator-avatar" };
const _hoisted_2 = ["src"];
const _hoisted_3 = { class: "icon" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ValidatorAvatar",
  props: {
    validator: {}
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const WalletAvatar = components.WalletAvatar;
    const avatar = computed(() => resolveValidatorAvatarUrl(props.validator));
    __expose({ avatar });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        avatar.value ? (openBlock(), createElementBlock("img", {
          key: 0,
          alt: "avatar",
          src: avatar.value
        }, null, 8, _hoisted_2)) : (openBlock(), createBlock(unref(WalletAvatar), {
          key: 1,
          address: __props.validator.address,
          size: 14,
          class: "account-gravatar"
        }, null, 8, ["address"])),
        createBaseVNode("div", _hoisted_3, [
          renderSlot(_ctx.$slots, "icon", {}, void 0, true)
        ])
      ]);
    };
  }
});
const ValidatorAvatar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-66df7a74"]]);
export {
  ValidatorAvatar as default
};
