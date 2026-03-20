import { z as defineComponent, aZ as components, u as useTranslation, e as useSettingsStore, cq as Languages, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, h as computed, A as createElementBlock, bQ as Fragment, bP as renderList, aj as unref, D as createBaseVNode, aN as toDisplayString, a9 as ref, b5 as nextTick, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "select-language-item__value" };
const _hoisted_2 = { class: "select-language-item__name" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SelectLanguageDialog",
    components: {
      DialogBase: components.DialogBase
    }
  },
  __name: "SelectLanguageDialog",
  setup(__props) {
    const { t } = useTranslation();
    const settingsStore = useSettingsStore();
    const selectedEl = ref(null);
    const isVisible = computed({
      get: () => settingsStore.selectLanguageDialogVisibility,
      set: (flag) => {
        settingsStore.setSelectLanguageDialogVisibility(flag);
        if (flag) {
          nextTick(() => selectedEl.value?.scrollIntoView({ behavior: "smooth" }));
        }
      }
    });
    const selectedLang = computed({
      get: () => settingsStore.language,
      set: (value) => {
        void settingsStore.setLanguage(value);
      }
    });
    const entries = Languages.map((language) => {
      const translationKey = `languages.${language.key}`;
      const translatedName = t(translationKey);
      return {
        key: language.key,
        value: language.value,
        name: translatedName !== translationKey ? translatedName : language.name
      };
    });
    function setSelectedEl(element, isSelected) {
      if (isSelected) {
        selectedEl.value = element;
      } else if (selectedEl.value === element) {
        selectedEl.value = null;
      }
    }
    return (_ctx, _cache) => {
      const _component_s_radio = resolveComponent("s-radio");
      const _component_s_radio_group = resolveComponent("s-radio-group");
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event),
        title: unref(t)("selectLanguageDialog.title"),
        "custom-class": "select-language-dialog"
      }, {
        default: withCtx(() => [
          createVNode(_component_s_scrollbar, { class: "select-language-scrollbar" }, {
            default: withCtx(() => [
              createVNode(_component_s_radio_group, {
                modelValue: selectedLang.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedLang.value = $event),
                class: "select-language-list s-flex"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(entries), (lang) => {
                    return openBlock(), createBlock(_component_s_radio, {
                      key: lang.key,
                      label: lang.key,
                      value: lang.key,
                      size: "medium",
                      class: "select-language-list__item s-flex"
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", {
                          ref_for: true,
                          ref: (el) => setSelectedEl(el, lang.key === selectedLang.value),
                          class: "select-language-item s-flex"
                        }, [
                          createBaseVNode("div", _hoisted_1, toDisplayString(lang.value), 1),
                          createBaseVNode("div", _hoisted_2, toDisplayString(lang.name), 1)
                        ], 512)
                      ]),
                      _: 2
                    }, 1032, ["label", "value"]);
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"])
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const SelectLanguageDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-97bafc53"]]);
export {
  SelectLanguageDialog as default
};
