import { z as defineComponent, e as useSettingsStore, a4 as onMounted, aB as onBeforeUnmount, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, aM as createCommentVNode, h as computed, C as openBlock, bA as withDirectives, ap as createVNode, ao as withCtx, bQ as Fragment, bP as renderList, a9 as ref, D as createBaseVNode, cd as normalizeStyle, aO as createTextVNode, aN as toDisplayString, da as TransitionGroup, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
function normalizeHashHref(href) {
  if (!href) return href;
  if (href.startsWith("/#")) return href.slice(1);
  if (href.startsWith("/") && !href.startsWith("//")) {
    const isIpfsRoot = /^\/(ipfs|ipns)\//i.test(href);
    const hasFileExtension = /\.[a-z0-9]+(?:[?#]|$)/i.test(href);
    if (!isIpfsRoot && !hasFileExtension) {
      return `#${href}`;
    }
  }
  return href;
}
function isInternalHashHref(href) {
  return normalizeHashHref(href).startsWith("#/");
}
const _hoisted_1 = {
  key: 0,
  class: "marketing s-flex"
};
const _hoisted_2 = ["target", "href"];
const _hoisted_3 = { class: "marketing-text" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AppMarketing",
  setup(__props) {
    const settingsStore = useSettingsStore();
    const adsArray = computed(() => {
      const ads = settingsStore.adsArray;
      if (Array.isArray(ads) && ads.length) {
        return ads;
      }
      const legacyAds = store.state?.settings?.adsArray;
      return Array.isArray(legacyAds) ? legacyAds : [];
    });
    const hasMultipleAds = computed(() => adsArray.value.length > 1);
    const currentIndex = ref(0);
    const transitionName = ref("slide");
    let interval = null;
    function getTarget(link) {
      return isInternalHashHref(link) ? "_self" : "_blank";
    }
    function getHref(link) {
      return normalizeHashHref(link);
    }
    function getStyles(ad) {
      const styles = { backgroundImage: `url(${ad.img})` };
      if (ad.backgroundColor) styles.backgroundColor = ad.backgroundColor;
      if (ad.right) {
        styles.backgroundPosition = `right ${ad.right} top`;
        styles.paddingRight = "24px";
      }
      return styles;
    }
    function prev() {
      if (!adsArray.value.length) return;
      transitionName.value = "slideback";
      currentIndex.value = currentIndex.value <= 0 ? adsArray.value.length - 1 : currentIndex.value - 1;
    }
    function next() {
      if (!adsArray.value.length) return;
      transitionName.value = "slide";
      currentIndex.value = currentIndex.value >= adsArray.value.length - 1 ? 0 : currentIndex.value + 1;
    }
    onMounted(() => {
      interval = setInterval(next, 6e4);
    });
    onBeforeUnmount(() => {
      if (interval) {
        clearInterval(interval);
      }
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _directive_button = resolveDirective("button");
      return adsArray.value.length ? (openBlock(), createElementBlock("div", _hoisted_1, [
        hasMultipleAds.value ? withDirectives((openBlock(), createElementBlock("span", {
          key: 0,
          class: "marketing-prev",
          onClick: prev
        }, [
          createVNode(_component_s_icon, { name: "arrows-chevron-left-rounded-24" })
        ])), [
          [_directive_button]
        ]) : createCommentVNode("", true),
        createVNode(TransitionGroup, {
          tag: "div",
          class: "marketing-slider",
          name: transitionName.value
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(adsArray.value, (ad, index) => {
              return openBlock(), createElementBlock(Fragment, null, [
                currentIndex.value === index ? (openBlock(), createElementBlock("div", {
                  key: ad.title
                }, [
                  createBaseVNode("a", {
                    class: "marketing-card",
                    rel: "nofollow noopener",
                    target: getTarget(ad.link),
                    style: normalizeStyle(getStyles(ad)),
                    href: getHref(ad.link)
                  }, [
                    createBaseVNode("span", _hoisted_3, [
                      createTextVNode(toDisplayString(ad.title) + " ", 1),
                      createVNode(_component_s_icon, {
                        class: "marketing-suffix",
                        name: "arrows-arrow-top-right-24",
                        size: "16px"
                      })
                    ]),
                    _cache[0] || (_cache[0] = createBaseVNode("span", { class: "marketing-image" }, null, -1))
                  ], 12, _hoisted_2)
                ])) : createCommentVNode("", true)
              ], 64);
            }), 256))
          ]),
          _: 1
        }, 8, ["name"]),
        hasMultipleAds.value ? withDirectives((openBlock(), createElementBlock("span", {
          key: 1,
          class: "marketing-next",
          onClick: next
        }, [
          createVNode(_component_s_icon, { name: "arrows-chevron-right-rounded-24" })
        ])), [
          [_directive_button]
        ]) : createCommentVNode("", true)
      ])) : createCommentVNode("", true);
    };
  }
});
const AppMarketing = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-504337c6"]]);
export {
  AppMarketing as default
};
