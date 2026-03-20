import { z as defineComponent, aZ as components, bm as toRefs, a_ as resolveComponent, A as createElementBlock, C as openBlock, am as createBlock, D as createBaseVNode, h as computed, aj as unref, aP as _export_sfc } from "./index-73GArslZ.js";
import { i as isTokenImage, g as getImageSrc } from "./pointSystem-B9fONsCS.js";
import "./tabs-xjDSPYBb.js";
const _hoisted_1 = { class: "progress-circle" };
const _hoisted_2 = ["r"];
const _hoisted_3 = ["r", "stroke-dasharray", "stroke-dashoffset", "transform"];
const _hoisted_4 = ["src", "alt"];
const svgSize = 72;
const strokeWidth = 3;
const imageSize = 27;
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "ProgressCard",
    components: {
      TokenLogo: components.TokenLogo
    }
  },
  __name: "ProgressCard",
  props: {
    imageName: {},
    progressPercentage: {}
  },
  setup(__props) {
    const props = __props;
    const { imageName } = toRefs(props);
    const center = svgSize / 2;
    const radius = computed(() => (svgSize - strokeWidth) / 2);
    const circumference = computed(() => 2 * Math.PI * radius.value);
    const progressDashOffset = computed(() => circumference.value * (1 - props.progressPercentage / 100));
    const tokenImage = computed(() => isTokenImage(imageName.value));
    const imageSrc = computed(() => getImageSrc(imageName.value));
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        (openBlock(), createElementBlock("svg", {
          width: svgSize,
          height: svgSize
        }, [
          createBaseVNode("circle", {
            class: "progress-circle__background",
            cx: center,
            cy: center,
            r: radius.value,
            "stroke-width": strokeWidth
          }, null, 8, _hoisted_2),
          createBaseVNode("circle", {
            class: "progress-circle__bar",
            cx: center,
            cy: center,
            r: radius.value,
            "stroke-width": strokeWidth,
            "stroke-dasharray": circumference.value,
            "stroke-dashoffset": progressDashOffset.value,
            "stroke-linecap": "round",
            transform: "rotate(-90 " + center + " " + center + ")"
          }, null, 8, _hoisted_3)
        ])),
        tokenImage.value ? (openBlock(), createBlock(_component_token_logo, {
          key: 0,
          class: "progress-circle__image",
          token: imageSrc.value,
          width: imageSize,
          height: imageSize
        }, null, 8, ["token"])) : (openBlock(), createElementBlock("img", {
          key: 1,
          class: "progress-circle__image",
          src: imageSrc.value,
          alt: unref(imageName),
          width: imageSize,
          height: imageSize
        }, null, 8, _hoisted_4))
      ]);
    };
  }
});
const ProgressCard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3677ee0c"]]);
export {
  ProgressCard as default
};
