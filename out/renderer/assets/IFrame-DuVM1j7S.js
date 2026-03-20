import { z as defineComponent, aA as watch, a9 as ref, bz as resolveDirective, bA as withDirectives, A as createElementBlock, C as openBlock, aM as createCommentVNode, h as computed, bb as normalizeClass, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = ["src", "sandbox"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "IFrame",
  props: {
    src: { default: "" },
    withBorder: { type: Boolean, default: false },
    allowedOrigins: { default: () => [] },
    sandbox: { default: "allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts allow-same-origin allow-top-navigation-by-user-activation" }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const widgetLoading = ref(false);
    const safeSrc = computed(() => {
      const raw = props.src?.trim();
      if (!raw) return "";
      if (typeof window === "undefined") return raw;
      try {
        const url = new URL(raw, window.location.origin);
        const isSameOrigin = url.origin === window.location.origin;
        if (isSameOrigin) return url.toString();
        if (url.protocol !== "https:") return "";
        const allowed = new Set(props.allowedOrigins.map((origin) => origin.toLowerCase()));
        return allowed.has(url.origin.toLowerCase()) ? url.toString() : "";
      } catch {
        return "";
      }
    });
    watch(
      safeSrc,
      (value) => {
        widgetLoading.value = Boolean(value);
      },
      { immediate: true }
    );
    function onLoadWidget() {
      widgetLoading.value = false;
    }
    __expose({
      widgetLoading
    });
    return (_ctx, _cache) => {
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", {
        class: normalizeClass(["widget-container", { "widget-container--bordered": __props.withBorder }])
      }, [
        safeSrc.value ? (openBlock(), createElementBlock("iframe", {
          key: 0,
          class: "widget",
          src: safeSrc.value,
          sandbox: __props.sandbox,
          referrerpolicy: "no-referrer",
          loading: "lazy",
          onLoad: onLoadWidget
        }, null, 40, _hoisted_1)) : createCommentVNode("", true)
      ], 2)), [
        [_directive_loading, widgetLoading.value]
      ]);
    };
  }
});
const IFrame = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-6ec68e97"]]);
export {
  IFrame as default
};
