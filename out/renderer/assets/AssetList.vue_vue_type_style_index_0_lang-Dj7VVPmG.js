import { z as defineComponent, aB as onBeforeUnmount, a9 as ref, A as createElementBlock, C as openBlock, D as createBaseVNode, cd as normalizeStyle, h as computed, aP as _export_sfc, bF as useAttrs, dk as useSlots, u as useTranslation, aA as watch, a4 as onMounted, a_ as resolveComponent, ap as createVNode, ao as withCtx, am as createBlock, aM as createCommentVNode, as as mergeProps, dR as toHandlers, an as createSlots, bP as renderList, aJ as renderSlot, bH as normalizeProps, bI as guardReactiveProps, aO as createTextVNode, aN as toDisplayString, aj as unref, bb as normalizeClass, dS as getCssVariableValue, dT as getScrollbarWidth, bY as delay, b5 as nextTick } from "./index-73GArslZ.js";
import AssetListItem from "./AssetListItem-BDm2NqjW.js";
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "ScrollBar",
  props: {
    move: { default: 0 },
    scrollHeight: { default: 0 },
    size: { default: 0 }
  },
  emits: ["change"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const bar = {
      offset: "offsetHeight",
      axis: "Y",
      client: "clientY",
      direction: "top"
    };
    const props = __props;
    const emit = __emit;
    const scrollbar = ref(null);
    const thumb = ref(null);
    const cursorDown = ref(false);
    const barAxisValue = ref(0);
    const style = computed(() => ({
      transform: `translate${bar.axis}(${props.move}%)`,
      height: props.size < 100 ? `${props.size}%` : ""
    }));
    function startDrag(e) {
      e.stopImmediatePropagation?.();
      cursorDown.value = true;
      document.addEventListener("mousemove", mouseMoveDocumentHandler);
      document.addEventListener("mouseup", mouseUpDocumentHandler);
      document.onselectstart = () => false;
    }
    function clickThumbHandler(e) {
      if (e.ctrlKey || e.button === 2) return;
      startDrag(e);
      const target = e.currentTarget;
      const offset = target[bar.offset];
      const diff = e[bar.client] - target.getBoundingClientRect()[bar.direction];
      barAxisValue.value = offset - diff;
    }
    function clickTrackHandler(e) {
      const target = e.currentTarget;
      const offset = Math.abs(target.getBoundingClientRect()[bar.direction] - e[bar.client]);
      const thumbHalf = (thumb.value?.[bar.offset] ?? 0) / 2;
      const trackSize = target[bar.offset];
      if (!trackSize) return;
      const thumbPositionPercentage = (offset - thumbHalf) * 100 / trackSize;
      const scrollTop = thumbPositionPercentage * props.scrollHeight / 100;
      emit("change", scrollTop);
    }
    function mouseMoveDocumentHandler(e) {
      if (!cursorDown.value) return;
      const prevPage = barAxisValue.value;
      if (!prevPage) return;
      const scrollbarEl = scrollbar.value;
      const thumbEl = thumb.value;
      if (!scrollbarEl || !thumbEl) return;
      const offset = (scrollbarEl.getBoundingClientRect()[bar.direction] - e[bar.client]) * -1;
      const thumbClickPosition = thumbEl[bar.offset] - prevPage;
      const scrollbarSize = scrollbarEl[bar.offset];
      if (!scrollbarSize) return;
      const thumbPositionPercentage = (offset - thumbClickPosition) * 100 / scrollbarSize;
      const scrollTop = thumbPositionPercentage * props.scrollHeight / 100;
      emit("change", scrollTop);
    }
    function mouseUpDocumentHandler() {
      cursorDown.value = false;
      barAxisValue.value = 0;
      document.removeEventListener("mousemove", mouseMoveDocumentHandler);
      document.removeEventListener("mouseup", mouseUpDocumentHandler);
      document.onselectstart = null;
    }
    onBeforeUnmount(() => {
      document.removeEventListener("mouseup", mouseUpDocumentHandler);
      document.removeEventListener("mousemove", mouseMoveDocumentHandler);
      document.onselectstart = null;
    });
    __expose({
      scrollbar,
      thumb,
      clickThumbHandler,
      clickTrackHandler,
      startDrag,
      mouseMoveDocumentHandler,
      mouseUpDocumentHandler
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "scrollbar",
        ref: scrollbar,
        class: "scrollbar",
        onMousedown: clickTrackHandler
      }, [
        createBaseVNode("div", {
          ref_key: "thumb",
          ref: thumb,
          class: "thumb",
          style: normalizeStyle(style.value),
          onMousedown: clickThumbHandler
        }, null, 36)
      ], 544);
    };
  }
});
const Scrollbar = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-f0bffce4"]]);
const _hoisted_1 = {
  key: 0,
  class: "asset-list-empty"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    inheritAttrs: false
  },
  __name: "AssetList",
  props: {
    assets: { default: () => [] },
    size: { default: 5 },
    divider: { type: Boolean, default: false },
    withClickableLogo: { type: Boolean, default: false },
    selected: { default: () => [] },
    selectable: { type: Boolean, default: false },
    pinnable: { type: Boolean, default: false },
    pinned: { default: () => [] },
    withFiat: { type: Boolean, default: false },
    withTabindex: { type: Boolean, default: true }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const attrs = useAttrs();
    const slots = useSlots();
    const { t } = useTranslation();
    const wrap = ref(null);
    const barSize = ref(0);
    const barMove = ref(0);
    const scrollHeight = ref(0);
    const forwardedSlots = computed(() => Object.keys(slots).filter((name) => name !== "list-empty"));
    const rootAttrs = computed(() => {
      return Object.fromEntries(Object.entries(attrs).filter(([key]) => !key.startsWith("on")));
    });
    const invokeListener = (handler, asset, args) => {
      if (Array.isArray(handler)) {
        handler.forEach((fn) => {
          if (typeof fn === "function") {
            fn(asset, ...args);
          }
        });
      } else if (typeof handler === "function") {
        handler(asset, ...args);
      }
    };
    const wrapListeners = (asset) => {
      const entries = Object.entries(attrs).filter(([key]) => key.startsWith("on"));
      return entries.reduce((result, [key, handler]) => {
        const eventName = key.slice(2);
        const normalized = eventName.charAt(0).toLowerCase() + eventName.slice(1);
        if (!handler) {
          return result;
        }
        result[normalized] = (...args) => {
          invokeListener(handler, asset, args);
        };
        return result;
      }, {});
    };
    const getScrollerEl = () => wrap.value?.$el;
    const isEmptyList = computed(() => props.assets.length === 0);
    const itemHeightCssVar = computed(() => `--s-asset-item-height${props.withFiat ? "--fiat" : ""}`);
    const itemHeightValue = computed(() => parseFloat(getCssVariableValue(itemHeightCssVar.value)) + Number(props.divider));
    const gutterOffset = computed(() => props.assets.length > props.size ? -1 * getScrollbarWidth() : 0);
    const style = computed(() => {
      const dividersHeight = props.divider ? props.size : 0;
      return {
        height: `calc(var(${itemHeightCssVar.value}) * ${props.size} + ${dividersHeight}px)`,
        marginRight: `${gutterOffset.value}px`
      };
    });
    const updateScrollbar = () => {
      const el = getScrollerEl();
      if (!el) return;
      barSize.value = el.clientHeight * 100 / el.scrollHeight;
      scrollHeight.value = el.scrollHeight;
    };
    const handleScroll = () => {
      const el = getScrollerEl();
      if (!el) return;
      barMove.value = el.scrollTop * 100 / el.clientHeight;
    };
    const scrollTo = (value) => {
      const el = getScrollerEl();
      if (!el) return;
      el.scrollTop = value;
    };
    const isSelected = (asset) => props.selected.some((selectedAsset) => selectedAsset.address === asset.address);
    const waitForAssetsListReady = async () => {
      const scroller = wrap.value;
      if (scroller?.ready) return;
      await delay();
      await waitForAssetsListReady();
    };
    const rerenderScrollbar = async () => {
      await nextTick();
      updateScrollbar();
      handleScroll();
    };
    watch(
      () => props.size,
      async () => {
        await rerenderScrollbar();
      }
    );
    watch(
      () => props.assets,
      async () => {
        await rerenderScrollbar();
      }
    );
    onMounted(async () => {
      await waitForAssetsListReady();
      updateScrollbar();
    });
    __expose({
      wrap,
      barSize,
      barMove,
      scrollHeight,
      forwardedSlots,
      wrapListeners,
      isEmptyList,
      itemHeightValue,
      gutterOffset,
      style,
      handleScroll,
      scrollTo,
      isSelected
    });
    return (_ctx, _cache) => {
      const _component_s_divider = resolveComponent("s-divider");
      const _component_recycle_scroller = resolveComponent("recycle-scroller");
      return openBlock(), createElementBlock("div", mergeProps({ class: "asset-list" }, rootAttrs.value), [
        createVNode(_component_recycle_scroller, {
          ref_key: "wrap",
          ref: wrap,
          items: __props.assets,
          "item-size": itemHeightValue.value,
          buffer: itemHeightValue.value,
          style: normalizeStyle(style.value),
          "key-field": "address",
          class: normalizeClass(["asset-list-inner", { "hidden-scrollbar": !gutterOffset.value }]),
          onScroll: handleScroll
        }, {
          before: withCtx(() => [
            isEmptyList.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
              renderSlot(_ctx.$slots, "list-empty", {}, () => [
                createTextVNode(toDisplayString(unref(t)("assets.empty")), 1)
              ])
            ])) : createCommentVNode("", true)
          ]),
          default: withCtx(({ item, index }) => [
            (openBlock(), createBlock(AssetListItem, mergeProps({
              key: index,
              asset: item,
              "with-clickable-logo": __props.withClickableLogo,
              selectable: __props.selectable,
              selected: isSelected(item),
              pinnable: __props.pinnable,
              "with-fiat": __props.withFiat,
              "with-tabindex": __props.withTabindex
            }, toHandlers(wrapListeners(item))), createSlots({ _: 2 }, [
              renderList(forwardedSlots.value, (name) => {
                return {
                  name,
                  fn: withCtx((slotProps) => [
                    renderSlot(_ctx.$slots, name, normalizeProps(guardReactiveProps(slotProps)))
                  ])
                };
              })
            ]), 1040, ["asset", "with-clickable-logo", "selectable", "selected", "pinnable", "with-fiat", "with-tabindex"])),
            __props.divider && index !== __props.assets.length - 1 ? (openBlock(), createBlock(_component_s_divider, {
              key: `${index}-divider`
            })) : createCommentVNode("", true)
          ]),
          _: 3
        }, 8, ["items", "item-size", "buffer", "style", "class"]),
        createVNode(Scrollbar, {
          move: barMove.value,
          size: barSize.value,
          "scroll-height": scrollHeight.value,
          class: "asset-list-scrollbar",
          onChange: scrollTo
        }, null, 8, ["move", "size", "scroll-height"])
      ], 16);
    };
  }
});
export {
  _sfc_main as _
};
