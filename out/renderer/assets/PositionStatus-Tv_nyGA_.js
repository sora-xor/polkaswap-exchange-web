import { z as defineComponent, d5 as VaultStatuses, u as useTranslation, A as createElementBlock, C as openBlock, D as createBaseVNode, aN as toDisplayString, h as computed, bb as normalizeClass, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "vault-status__label" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PositionStatus",
  props: {
    status: { default: VaultStatuses.Opened }
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const statusClass = computed(() => props.status.toLowerCase());
    const statusLabel = computed(() => t(`kensetsu.status.${props.status}`));
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["vault-status", statusClass.value])
      }, [
        createBaseVNode("span", _hoisted_1, toDisplayString(statusLabel.value), 1)
      ], 2);
    };
  }
});
const PositionStatus = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-63463161"]]);
export {
  PositionStatus as default
};
