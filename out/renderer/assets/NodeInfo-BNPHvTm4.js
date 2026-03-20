import { aI as WALLET_CONSTS, z as defineComponent, u as useTranslation, bm as toRefs, aA as watch, a4 as onMounted, h as computed, b5 as nextTick, a9 as ref, a_ as resolveComponent, am as createBlock, C as openBlock, aq as withModifiers, cn as reactive, ao as withCtx, ap as createVNode, aM as createCommentVNode, A as createElementBlock, aj as unref, D as createBaseVNode, aN as toDisplayString, aO as createTextVNode, dH as Links, dl as formatLocation, aP as _export_sfc } from "./index-73GArslZ.js";
import GenericPageHeader from "./GenericPageHeader-CbYst_Y9.js";
const ws = "wss?:\\/\\/";
const port = "(?::([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))";
const dns = "(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)*[a-z0-9][a-z0-9-]{0,61}[a-z0-9]";
const segment = "\\/[a-z0-9-_]+";
const ipv4part = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)";
const ipv4 = `${ipv4part}(?:\\.${ipv4part}){3}`;
const exactStart = (exp) => `^${exp}`;
const exact = (exp) => `^${exp}$`;
const wsRegexp = new RegExp(exactStart(ws));
const secureWsRegexp = /^wss:\/\//;
const dnsPathRegexp = new RegExp(exactStart(`${dns}${port}?(${segment})*/?`));
const ipv4Regexp = new RegExp(exact(`${ipv4}${port}?(${segment})*/?`));
WALLET_CONSTS.syntheticAssetRegexp;
WALLET_CONSTS.kensetsuAssetRegexp;
const localhostHostnames = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const isLocalWsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "ws:" && localhostHostnames.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};
const NodeModel = {
  chain: "",
  name: "",
  address: "",
  location: ""
};
const _hoisted_1 = { class: "node-info-input location-input s-typography-input-field" };
const _hoisted_2 = { class: "location-input__placeholder" };
const _hoisted_3 = { class: "location-input__value" };
const _hoisted_4 = { class: "flag-emodji" };
const _hoisted_5 = ["href"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "NodeInfo",
  props: {
    handleBack: { type: Function, default: void 0 },
    handleNode: { type: Function, default: void 0 },
    removeNode: { type: Function, default: void 0 },
    node: { default: () => ({ ...NodeModel }) },
    existing: { type: Boolean, default: false },
    removable: { type: Boolean, default: false },
    connected: { type: Boolean, default: false },
    showTutorial: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    nodeAddressConnecting: { default: "" }
  },
  setup(__props) {
    const stripEndingSlash = (str) => str.endsWith("/") ? str.slice(0, -1) : str;
    const checkAddress = (translate) => (_rule, value, callback) => {
      if (!value) return callback(new Error(translate("selectNodeDialog.messages.emptyAddress")));
      if (!wsRegexp.test(value)) {
        return callback(new Error(translate("selectNodeDialog.messages.incorrectProtocol")));
      }
      if (!secureWsRegexp.test(value) && !isLocalWsUrl(value)) {
        return callback(new Error(translate("selectNodeDialog.messages.incorrectProtocol")));
      }
      const address = value.replace(wsRegexp, "");
      if (!dnsPathRegexp.test(address) && !ipv4Regexp.test(address)) {
        return callback(new Error(translate("selectNodeDialog.messages.incorrectAddress")));
      }
      callback();
    };
    const props = __props;
    const { t } = useTranslation();
    const { existing, removable, connected, showTutorial, disabled, nodeAddressConnecting } = toRefs(props);
    const nodeForm = ref(null);
    const nodeNameInput = ref(null);
    const nodeModel = reactive({ ...NodeModel });
    watch(
      () => props.node,
      (node) => {
        Object.assign(nodeModel, NodeModel, node ?? {});
      },
      { immediate: true }
    );
    const validationRules = computed(() => ({
      name: [{ required: true, message: t("selectNodeDialog.messages.emptyName"), trigger: "blur" }],
      address: [{ validator: checkAddress(t), trigger: "blur" }]
    }));
    const formattedLocation = computed(() => {
      if (!(existing.value && props.node?.location)) return null;
      return formatLocation(props.node.location);
    });
    const inputDisabled = computed(() => existing.value && !removable.value);
    const nodeDataChanged = computed(
      () => nodeModel.name !== props.node?.name || nodeModel.address !== props.node?.address
    );
    const title = computed(() => {
      const customNodeText = t("selectNodeDialog.customNode");
      if (!existing.value) return customNodeText;
      return props.node?.chain || props.node?.name || customNodeText;
    });
    const buttonText = computed(() => {
      if (!existing.value) return t("selectNodeDialog.addNode");
      if (nodeDataChanged.value) return t("selectNodeDialog.updateNode");
      if (connected.value) return t("selectNodeDialog.connected");
      return t("selectNodeDialog.select");
    });
    const buttonDisabled = computed(() => disabled.value || connected.value && !nodeDataChanged.value);
    const buttonType = computed(() => nodeDataChanged.value || !existing.value ? "primary" : "tertiary");
    const loading = computed(
      () => Boolean(nodeAddressConnecting.value) && nodeModel.address === nodeAddressConnecting.value
    );
    const tutorialLink = Links.nodes.tutorial;
    function changeNodeAddress(value) {
      nodeModel.address = value.trim().toLowerCase();
    }
    function handleBackClick() {
      props.handleBack?.();
    }
    function removeNodeHandler() {
      props.removeNode?.({ ...nodeModel });
    }
    async function submitForm() {
      try {
        await nodeForm.value?.validate?.();
        const preparedModel = {
          ...nodeModel,
          address: stripEndingSlash((nodeModel.address ?? "").trim())
        };
        props.handleNode?.(preparedModel, !existing.value || nodeDataChanged.value);
      } catch (error) {
        console.warn(error);
      }
    }
    onMounted(() => {
      if (!inputDisabled.value) {
        nextTick(() => nodeNameInput.value?.focus?.());
      }
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_s_input = resolveComponent("s-input");
      const _component_s_form_item = resolveComponent("s-form-item");
      const _component_s_form = resolveComponent("s-form");
      return openBlock(), createBlock(_component_s_form, {
        ref_key: "nodeForm",
        ref: nodeForm,
        model: nodeModel,
        rules: validationRules.value,
        class: "node-info s-flex",
        onSubmit: withModifiers(submitForm, ["prevent"])
      }, {
        default: withCtx(() => [
          createVNode(GenericPageHeader, {
            class: "node-info-title",
            "has-button-back": "",
            title: title.value,
            onBack: withModifiers(handleBackClick, ["stop"])
          }, {
            default: withCtx(() => [
              unref(existing) && unref(removable) ? (openBlock(), createBlock(_component_s_button, {
                key: 0,
                type: "action",
                icon: "basic-trash-24",
                onClick: removeNodeHandler
              })) : createCommentVNode("", true)
            ]),
            _: 1
          }, 8, ["title"]),
          createVNode(_component_s_form_item, { prop: "name" }, {
            default: withCtx(() => [
              createVNode(_component_s_input, {
                ref_key: "nodeNameInput",
                ref: nodeNameInput,
                class: "node-info-input s-typography-input-field",
                placeholder: unref(t)("nameText"),
                modelValue: nodeModel.name,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => nodeModel.name = $event),
                maxlength: 128,
                disabled: inputDisabled.value
              }, null, 8, ["placeholder", "modelValue", "disabled"])
            ]),
            _: 1
          }),
          createVNode(_component_s_form_item, { prop: "address" }, {
            default: withCtx(() => [
              createVNode(_component_s_input, {
                class: "node-info-input s-typography-input-field",
                placeholder: unref(t)("addressText"),
                modelValue: nodeModel.address,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => nodeModel.address = $event),
                disabled: inputDisabled.value,
                onChange: changeNodeAddress
              }, null, 8, ["placeholder", "modelValue", "disabled"])
            ]),
            _: 1
          }),
          formattedLocation.value ? (openBlock(), createBlock(_component_s_form_item, {
            key: 0,
            prop: "location"
          }, {
            default: withCtx(() => [
              createBaseVNode("div", _hoisted_1, [
                createBaseVNode("span", _hoisted_2, toDisplayString(unref(t)("locationText")), 1),
                createBaseVNode("span", _hoisted_3, [
                  createTextVNode(toDisplayString(formattedLocation.value.name) + " ", 1),
                  createBaseVNode("span", _hoisted_4, toDisplayString(formattedLocation.value.flag), 1)
                ])
              ])
            ]),
            _: 1
          })) : createCommentVNode("", true),
          createVNode(_component_s_button, {
            "native-type": "submit",
            class: "node-info-button s-typography-button--big",
            type: buttonType.value,
            disabled: buttonDisabled.value,
            loading: loading.value
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(buttonText.value), 1)
            ]),
            _: 1
          }, 8, ["type", "disabled", "loading"]),
          unref(showTutorial) ? (openBlock(), createElementBlock("a", {
            key: 1,
            href: unref(tutorialLink),
            class: "node-info-button",
            tabindex: "-1",
            target: "_blank",
            rel: "noreferrer noopener"
          }, [
            createVNode(_component_s_button, {
              type: "tertiary",
              class: "node-info-tutorial-button s-typography-button--medium"
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("selectNodeDialog.howToSetupOwnNode")), 1)
              ]),
              _: 1
            })
          ], 8, _hoisted_5)) : createCommentVNode("", true)
        ]),
        _: 1
      }, 8, ["model", "rules"]);
    };
  }
});
const NodeInfo = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-8b1339fc"]]);
const NodeInfo$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: NodeInfo
}, Symbol.toStringTag, { value: "Module" }));
export {
  NodeInfo as N,
  NodeModel as a,
  NodeInfo$1 as b
};
