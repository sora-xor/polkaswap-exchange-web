import { z as defineComponent, aZ as components, u as useTranslation, Y as useWeb3Store, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, bb as normalizeClass, h as computed, A as createElementBlock, bQ as Fragment, bP as renderList, j as BridgeNetworkType, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useNetworkFormatter } from "./useNetworkFormatter-Cuwa7_ot.js";
const _hoisted_1 = { class: "networks-info" };
const _hoisted_2 = { class: "network-name" };
const _hoisted_3 = { class: "network-name-info" };
const _hoisted_4 = { key: 1 };
const DELIMITER = "-";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      ExternalLink: components.ExternalLink,
      TokenLogo: components.TokenLogo,
      SRadioGroup: components.SRadioGroup,
      SRadio: components.SRadio,
      SScrollbar: components.SScrollbar
    }
  },
  __name: "SelectNetwork",
  setup(__props) {
    const { t } = useTranslation();
    const { getNetworkIcon } = useNetworkFormatter();
    const web3Store = useWeb3Store();
    const visibility = computed({
      get: () => web3Store.selectNetworkDialogVisibility,
      set: (flag) => {
        web3Store.setSelectNetworkDialogVisibility(flag);
      }
    });
    const availableNetworks = computed(
      () => web3Store.availableNetworks ?? {}
    );
    const networkType = computed(() => web3Store.networkType);
    const networkSelected = computed(() => web3Store.networkSelected);
    const networks = computed(
      () => Object.entries(availableNetworks.value).map(([type, record]) => {
        const items = Object.values(record ?? {});
        return items.reduce((buffer, { disabled, data: { id, name } }) => {
          const content = disabled ? t("comingSoonText") : "";
          buffer.push({
            id,
            value: `${type}${DELIMITER}${id}`,
            name,
            disabled,
            info: {
              content,
              link: false
            }
          });
          return buffer;
        }, []);
      }).flat().sort((a, b) => Number(a.disabled) - Number(b.disabled))
    );
    const selectedNetworkTuple = computed({
      get: () => {
        if (networkType.value == null || networkSelected.value == null) return "";
        return `${networkType.value}${DELIMITER}${networkSelected.value}`;
      },
      set: (value) => {
        const [typeRaw, idRaw] = value.split(DELIMITER);
        if (!typeRaw || !idRaw) return;
        const type = typeRaw;
        const id = type === BridgeNetworkType.Sub ? idRaw : Number(idRaw);
        web3Store.selectExternalNetwork({ id, type });
        visibility.value = false;
      }
    });
    return (_ctx, _cache) => {
      const _component_external_link = resolveComponent("external-link");
      const _component_s_radio = resolveComponent("s-radio");
      const _component_s_radio_group = resolveComponent("s-radio-group");
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visibility.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => visibility.value = $event),
        title: unref(t)("bridge.selectNetwork"),
        class: "networks",
        "custom-class": "networks"
      }, {
        default: withCtx(() => [
          createBaseVNode("p", _hoisted_1, toDisplayString(unref(t)("bridge.networkInfo")), 1),
          createVNode(_component_s_scrollbar, {
            class: normalizeClass(["networks-scrollbar", { "networks-scrollbar--single": networks.value.length <= 1 }])
          }, {
            default: withCtx(() => [
              createVNode(_component_s_radio_group, {
                modelValue: selectedNetworkTuple.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedNetworkTuple.value = $event),
                class: "networks-list"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(networks.value, ({ id, value, name, disabled, info }) => {
                    return openBlock(), createBlock(_component_s_radio, {
                      key: value,
                      label: value,
                      value,
                      disabled,
                      class: "network"
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_2, [
                          createBaseVNode("span", null, toDisplayString(name), 1),
                          createBaseVNode("div", _hoisted_3, [
                            info?.content && info.link ? (openBlock(), createBlock(_component_external_link, {
                              key: 0,
                              title: info.content,
                              href: info.content
                            }, null, 8, ["title", "href"])) : (openBlock(), createElementBlock("span", _hoisted_4, toDisplayString(info?.content ?? ""), 1))
                          ])
                        ]),
                        createBaseVNode("i", {
                          class: normalizeClass(["network-icon", `network-icon--${unref(getNetworkIcon)(id)}`])
                        }, null, 2)
                      ]),
                      _: 2
                    }, 1032, ["label", "value", "disabled"]);
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"])
            ]),
            _: 1
          }, 8, ["class"])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const SelectNetwork = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-dbeface5"]]);
export {
  SelectNetwork as default
};
