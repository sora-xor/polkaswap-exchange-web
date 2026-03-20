import { z as defineComponent, dk as useSlots, a4 as onMounted, aB as onBeforeUnmount, a9 as ref, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, am as createBlock, C as openBlock, an as createSlots, ao as withCtx, h as computed, D as createBaseVNode, bb as normalizeClass, A as createElementBlock, aM as createCommentVNode, aJ as renderSlot, aN as toDisplayString, aj as unref, ce as capitalize, ap as createVNode, cn as reactive, $ as getCurrentInstance, bJ as isEqual, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { key: 0 };
const _hoisted_2 = {
  key: 0,
  class: "base-widget-block base-widget-filters"
};
const _hoisted_3 = {
  key: 1,
  class: "base-widget-block base-widget-types"
};
const _hoisted_4 = {
  key: 2,
  class: "base-widget-block base-widget-pip"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Base",
  props: {
    id: { default: "" },
    primaryTitle: { type: Boolean, default: false },
    title: { default: "" },
    tooltip: { default: "" },
    full: { type: Boolean, default: false },
    delimeter: { type: Boolean, default: false },
    extensive: { type: Boolean, default: false },
    flat: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    pipDisabled: { type: Boolean, default: false },
    onResize: { type: Function, default: () => {
    } }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const slots = useSlots();
    const instance = getCurrentInstance();
    const container = ref(null);
    const content = ref(null);
    const pipOpened = ref(false);
    const pipWindow = ref(null);
    const size = reactive({
      width: 0,
      height: 0
    });
    const hasHeader = computed(() => Boolean(props.title) || Boolean(slots.title));
    const hasContent = computed(() => Boolean(slots.default));
    const shadow = computed(() => props.flat ? "never" : "always");
    const capitalize$1 = capitalize;
    const isPipAvailable = computed(() => {
      if (props.pipDisabled || pipOpened.value) return false;
      if (typeof window === "undefined") return false;
      return "documentPictureInPicture" in window;
    });
    let resizeAnimationFrame = null;
    const requestResizeFrame = (callback) => {
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        return window.requestAnimationFrame(callback);
      }
      return window.setTimeout(() => callback(Date.now()), 16);
    };
    const cancelResizeFrame = (frameId) => {
      if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(frameId);
        return;
      }
      window.clearTimeout(frameId);
    };
    const handleContentResize = () => {
      if (resizeAnimationFrame !== null) return;
      resizeAnimationFrame = requestResizeFrame(() => {
        resizeAnimationFrame = null;
        const currentSize = getRequiredWidgetSize();
        if (!isEqual(currentSize)(size)) {
          props.onResize?.(props.id, currentSize);
          updateSize(currentSize);
        }
      });
    };
    let contentObserver = null;
    let mutationObserver = null;
    function getElementSize(el) {
      if (!el) {
        return { width: 0, height: 0 };
      }
      const { width, height } = el.getBoundingClientRect();
      return {
        width: Math.floor(width),
        height: Math.floor(height)
      };
    }
    function resolveContainerElement() {
      const el = container.value;
      if (!el) return instance?.proxy?.$el;
      if (el.$el) return el.$el;
      return el;
    }
    function getWidgetSize() {
      return getElementSize(resolveContainerElement());
    }
    function getRequiredWidgetSize() {
      const widgetSize = getWidgetSize();
      const containerEl = resolveContainerElement();
      const contentEl = content.value;
      if (!containerEl || !contentEl) return widgetSize;
      const containerRect = containerEl.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();
      const contentOffsetTop = Math.max(0, contentRect.top - containerRect.top);
      const intrinsicContentHeight = Array.from(contentEl.children).reduce((height, child) => {
        const childEl = child;
        const childRect = childEl.getBoundingClientRect();
        const childOffsetTop = Math.max(0, childRect.top - contentRect.top);
        const childHeight = Math.max(Math.ceil(childRect.height), childEl.scrollHeight);
        return Math.max(height, Math.ceil(childOffsetTop + childHeight));
      }, 0);
      const resolvedContentHeight = intrinsicContentHeight || Math.ceil(contentEl.scrollHeight);
      const requiredHeight = Math.ceil(contentOffsetTop + resolvedContentHeight);
      return {
        width: widgetSize.width,
        height: Math.max(1, requiredHeight)
      };
    }
    function updateSize(newSize) {
      size.width = newSize.width;
      size.height = newSize.height;
    }
    function createContentObserver() {
      if (!hasContent.value || typeof ResizeObserver === "undefined") return;
      destroyContentObserver();
      contentObserver = new ResizeObserver(() => handleContentResize());
      if (content.value) {
        contentObserver.observe(content.value);
        Array.from(content.value.children).forEach((child) => {
          contentObserver?.observe(child);
        });
      }
    }
    function destroyContentObserver() {
      contentObserver?.disconnect();
      contentObserver = null;
    }
    function createMutationObserver() {
      if (typeof MutationObserver === "undefined") return;
      destroyMutationObserver();
      const config = { childList: true };
      mutationObserver = new MutationObserver((mutationList) => {
        const pip = pipWindow.value;
        if (!pip) return;
        mutationList.forEach((mutation) => {
          Array.from(mutation.addedNodes).forEach((node) => {
            pip.document.head.appendChild(node.cloneNode(true));
          });
        });
      });
      mutationObserver.observe(document.head, config);
    }
    function destroyMutationObserver() {
      mutationObserver?.disconnect();
      mutationObserver = null;
    }
    function closePip() {
      if (pipOpened.value && pipWindow.value) {
        destroyMutationObserver();
        pipWindow.value.close();
        pipOpened.value = false;
        pipWindow.value = null;
      }
    }
    async function openPip() {
      if (!isPipAvailable.value) return;
      try {
        const rootElement = instance?.proxy?.$el;
        if (!rootElement) return;
        const requestWindow = window.documentPictureInPicture?.requestWindow?.bind(
          window.documentPictureInPicture
        );
        if (!requestWindow) return;
        const pip = await requestWindow({
          width: rootElement.clientWidth,
          height: rootElement.clientHeight
        });
        pipOpened.value = true;
        pipWindow.value = pip;
        const originalParent = rootElement.parentNode;
        const allStyles = Array.from(document.styleSheets).map((styleSheet) => {
          try {
            return Array.from(styleSheet.cssRules ?? []).map((rule) => rule.cssText).join("\n");
          } catch {
            return "";
          }
        }).join("\n");
        const style = pip.document.createElement("style");
        style.textContent = allStyles;
        pip.document.head.appendChild(style);
        const pipHtml = pip.document.documentElement;
        const originalHtml = document.documentElement;
        Array.from(originalHtml.attributes).forEach((attribute) => {
          pipHtml.setAttribute(attribute.nodeName, attribute.nodeValue ?? "");
        });
        pip.document.body.appendChild(rootElement);
        createMutationObserver();
        pip.addEventListener("pagehide", () => {
          closePip();
          if (originalParent) {
            originalParent.appendChild(rootElement);
          }
        });
      } catch (error) {
        console.error("Error during PiP handling:", error);
      }
    }
    onMounted(() => {
      createContentObserver();
      updateSize(getRequiredWidgetSize());
    });
    onBeforeUnmount(() => {
      destroyContentObserver();
      destroyMutationObserver();
      if (resizeAnimationFrame !== null) {
        cancelResizeFrame(resizeAnimationFrame);
        resizeAnimationFrame = null;
      }
      closePip();
    });
    __expose({
      openPip,
      closePip,
      pipOpened
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_card = resolveComponent("s-card");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createBlock(_component_s_card, {
        ref_key: "container",
        ref: container,
        size: "big",
        "border-radius": "small",
        primary: "",
        shadow: shadow.value,
        class: normalizeClass(["base-widget", { delimeter: __props.delimeter, full: __props.full, flat: __props.flat, pip: pipOpened.value }])
      }, createSlots({
        default: withCtx(() => [
          hasContent.value ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass(["base-widget-content", { extensive: __props.extensive }]),
            ref_key: "content",
            ref: content
          }, [
            renderSlot(_ctx.$slots, "default", {}, void 0, true)
          ], 2)) : createCommentVNode("", true)
        ]),
        _: 2
      }, [
        hasHeader.value ? {
          name: "header",
          fn: withCtx(() => [
            createBaseVNode("div", {
              class: normalizeClass(["base-widget-block", "base-widget-header", { "with-content": hasContent.value }])
            }, [
              createBaseVNode("div", {
                class: normalizeClass(["base-widget-block", "base-widget-title", { primary: __props.primaryTitle }])
              }, [
                renderSlot(_ctx.$slots, "title", {}, () => [
                  __props.title ? (openBlock(), createElementBlock("span", _hoisted_1, toDisplayString(unref(capitalize$1)(__props.title)), 1)) : createCommentVNode("", true),
                  __props.tooltip ? (openBlock(), createBlock(_component_s_tooltip, {
                    key: 1,
                    "border-radius": "mini",
                    content: __props.tooltip
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_s_icon, {
                        name: "info-16",
                        size: "14px"
                      })
                    ]),
                    _: 1
                  }, 8, ["content"])) : createCommentVNode("", true)
                ], true)
              ], 2),
              _ctx.$slots.filters ? (openBlock(), createElementBlock("div", _hoisted_2, [
                renderSlot(_ctx.$slots, "filters", {}, void 0, true)
              ])) : createCommentVNode("", true),
              _ctx.$slots.types ? (openBlock(), createElementBlock("div", _hoisted_3, [
                renderSlot(_ctx.$slots, "types", {}, void 0, true)
              ])) : createCommentVNode("", true),
              isPipAvailable.value ? (openBlock(), createElementBlock("div", _hoisted_4, [
                createVNode(_component_s_button, {
                  type: "action",
                  size: "small",
                  alternative: "",
                  onClick: openPip,
                  tooltip: "Open in top window"
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_s_icon, {
                      name: "finance-receive-24",
                      size: "24"
                    })
                  ]),
                  _: 1
                })
              ])) : createCommentVNode("", true)
            ], 2)
          ]),
          key: "0"
        } : void 0
      ]), 1032, ["shadow", "class"])), [
        [_directive_loading, __props.loading]
      ]);
    };
  }
});
const BaseWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f22e49f5"]]);
export {
  BaseWidget as default
};
