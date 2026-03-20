import { z as defineComponent, bO as AccountActionTypes, u as useTranslation, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, bP as renderList, bb as normalizeClass, aO as createTextVNode, aN as toDisplayString, bQ as Fragment } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ActionsMenu",
  props: {
    actions: { default: () => [] }
  },
  setup(__props, { expose: __expose }) {
    const actionsMetadata = {
      [AccountActionTypes.Rename]: {
        name: "account.rename",
        icon: "basic-options-24",
        status: ""
      },
      [AccountActionTypes.Export]: {
        name: "account.export",
        icon: "basic-pulse-24",
        status: ""
      },
      [AccountActionTypes.Logout]: {
        name: "logoutText",
        icon: "security-logout-24",
        status: ""
      },
      [AccountActionTypes.Delete]: {
        name: "account.delete",
        icon: "paperclip-16",
        status: "error"
      },
      [AccountActionTypes.BookSend]: {
        name: "addressBook.options.send",
        icon: "finance-send-24",
        status: ""
      },
      [AccountActionTypes.BookEdit]: {
        name: "addressBook.options.edit",
        icon: "el-icon-edit",
        status: ""
      },
      [AccountActionTypes.BookDelete]: {
        name: "addressBook.options.delete",
        icon: "el-icon-delete",
        status: ""
      }
    };
    const props = __props;
    const { t } = useTranslation();
    const items = computed(
      () => props.actions.map((value) => {
        const { name, icon, status } = actionsMetadata[value];
        return {
          value,
          name: t(name),
          icon,
          status
        };
      })
    );
    __expose({ items });
    return (_ctx, _cache) => {
      const _component_s_dropdown_item = resolveComponent("s-dropdown-item");
      const _component_s_dropdown = resolveComponent("s-dropdown");
      return openBlock(), createBlock(_component_s_dropdown, {
        type: "ellipsis",
        "border-radius": "mini",
        icon: "basic-more-vertical-24",
        class: "account-actions",
        "popper-class": "account-actions-menu"
      }, {
        menu: withCtx(() => [
          (openBlock(true), createElementBlock(Fragment, null, renderList(items.value, ({ value, name, icon, status }) => {
            return openBlock(), createBlock(_component_s_dropdown_item, {
              key: value,
              value,
              class: normalizeClass(["account-actions__item", status]),
              icon
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(name), 1)
              ]),
              _: 2
            }, 1032, ["value", "class", "icon"]);
          }), 128))
        ]),
        _: 1
      });
    };
  }
});
export {
  _sfc_main as _
};
