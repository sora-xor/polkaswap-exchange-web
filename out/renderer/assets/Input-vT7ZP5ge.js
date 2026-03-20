import { z as defineComponent, u as useTranslation, a9 as ref, ed as debounce, dU as getAccountIdentity, aA as watch, h as computed, b5 as nextTick, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, A as createElementBlock, aM as createCommentVNode, aj as unref, bQ as Fragment, aN as toDisplayString, aO as createTextVNode, ar as isRef, cK as formatAccountAddress, ee as validateAddress, c0 as toRef, aP as _export_sfc, bO as AccountActionTypes, bz as resolveDirective, bP as renderList, bA as withDirectives, cn as reactive, ef as mapMutations, bV as mapState, bS as TranslationMixin, eg as subscribeToWalletAccounts, ay as api, bb as normalizeClass, as as mergeProps } from "./index-73GArslZ.js";
import { _ as _sfc_main$4 } from "./WalletAccount.vue_vue_type_style_index_0_lang-DjfimqnM.js";
import { u as useCopyAddress } from "./useCopyAddress-CJeOU9NK.js";
import { u as useDialogVisibility, _ as _sfc_main$3 } from "./DialogBase.vue_vue_type_style_index_0_lang-BJGYcuJm.js";
import { _ as _sfc_main$5 } from "./ActionsMenu.vue_vue_type_style_index_0_lang-BVo3j2aj.js";
import SearchInput from "./SearchInput-aaMTnmub.js";
import "./FormattedAddress-BPe25jN5.js";
import "./AccountCard-xpQIDQ4O.js";
import "./WalletAvatar.vue_vue_type_script_setup_true_lang-mm2xyMMC.js";
import "./InputFocusMixin-CmEfEypi.js";
const _hoisted_1$2 = { class: "set-address" };
const _hoisted_2$2 = { class: "wallet-send-address-warning" };
const _hoisted_3$2 = { class: "set-address__btn" };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  ...{ name: "AddressBookContactDialog" },
  __name: "Contact",
  props: {
    visible: { type: Boolean, default: false },
    book: { default: () => ({}) },
    accounts: { default: () => [] },
    prefilledAddress: { default: "" },
    isEditMode: { type: Boolean, default: false }
  },
  emits: ["update:visible", "close", "add"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { handleCopyAddress, copyTooltip } = useCopyAddress();
    const { isVisible, closeDialog } = useDialogVisibility(toRef(props, "visible"), {
      emit: (value) => emit("update:visible", value),
      onClose: () => emit("close")
    });
    const addressInput = ref(null);
    const address = ref("");
    const name = ref("");
    const onChainIdentity = ref(t("addressBook.none"));
    const loading = ref(false);
    const book = computed(() => props.book ?? {});
    const accounts = computed(() => props.accounts ?? []);
    const formattedName = computed(() => name.value.trim());
    const formattedSoraAddress = computed(() => formatAccountAddress(address.value));
    const emptyAddress = computed(() => !address.value.trim());
    const inputDisabled = computed(() => props.isEditMode);
    const validAddress = computed(() => validateAddress(address.value));
    const isNotSoraAddress = computed(() => !!formattedSoraAddress.value && address.value.slice(0, 2) !== "cn");
    const isAddressAdded = computed(() => {
      const matchedAccount = accounts.value.find(
        (account) => formatAccountAddress(account.address) === formattedSoraAddress.value
      );
      return Boolean(book.value[address.value]) || Boolean(matchedAccount);
    });
    const isAddressPresented = computed(() => isAddressAdded.value && !props.isEditMode);
    const btnDisabled = computed(() => !validAddress.value || !formattedName.value || isAddressPresented.value);
    const btnText = computed(() => {
      if (!formattedName.value) return t("addressBook.btn.enterName");
      if (!validAddress.value) {
        return t(`walletSend.${emptyAddress.value ? "enterAddress" : "badAddress"}`);
      }
      if (isAddressPresented.value) return t("addressBook.btn.present");
      return props.isEditMode ? t("addressBook.btn.saveChanges") : t("saveText");
    });
    const title = computed(() => props.isEditMode ? t("addressBook.options.edit") : t("addressBook.addContact"));
    const tooltip = computed(() => t("addressBook.tooltip"));
    const copyValueAssetId = computed(() => copyTooltip(t("assets.assetId")));
    const defineIdentity = debounce(500)(async (value) => {
      if (!value) {
        onChainIdentity.value = t("addressBook.none");
        return;
      }
      const identity = await getAccountIdentity(value);
      onChainIdentity.value = identity?.name ?? t("addressBook.none");
    });
    const setContact = () => {
      const record = { address: formattedSoraAddress.value, name: formattedName.value };
      emit("add", record);
      closeDialog();
    };
    const resetState = () => {
      address.value = "";
      name.value = "";
      onChainIdentity.value = t("addressBook.none");
    };
    watch(isVisible, async (visible) => {
      if (!visible) {
        resetState();
        return;
      }
      if (props.prefilledAddress) {
        address.value = props.prefilledAddress;
        name.value = book.value[props.prefilledAddress] ?? "";
      }
      await nextTick();
      addressInput.value?.focus?.();
    });
    return (_ctx, _cache) => {
      const _component_s_input = resolveComponent("s-input");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(_sfc_main$3, {
        visible: unref(isVisible),
        "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => isRef(isVisible) ? isVisible.value = $event : null),
        title: title.value,
        tooltip: tooltip.value,
        "append-to-body": ""
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$2, [
            createVNode(_component_s_input, {
              ref_key: "addressInput",
              ref: addressInput,
              modelValue: name.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => name.value = $event),
              class: "set-address__input",
              placeholder: unref(t)("nameText"),
              disabled: loading.value,
              maxlength: 30
            }, null, 8, ["modelValue", "placeholder", "disabled"]),
            createVNode(_component_s_input, {
              modelValue: address.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => address.value = $event),
              class: "set-address__input",
              placeholder: unref(t)("addressText"),
              disabled: inputDisabled.value,
              onInput: unref(defineIdentity)
            }, null, 8, ["modelValue", "placeholder", "disabled", "onInput"]),
            validAddress.value && isNotSoraAddress.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createBaseVNode("p", _hoisted_2$2, toDisplayString(unref(t)("addressBook.notSoraAddress")), 1),
              createVNode(_component_s_tooltip, {
                content: copyValueAssetId.value,
                placement: "top"
              }, {
                default: withCtx(() => [
                  createBaseVNode("p", {
                    class: "wallet-send-address-formatted",
                    onClick: _cache[2] || (_cache[2] = ($event) => unref(handleCopyAddress)(formattedSoraAddress.value, $event))
                  }, toDisplayString(formattedSoraAddress.value), 1)
                ]),
                _: 1
              }, 8, ["content"])
            ], 64)) : createCommentVNode("", true),
            createVNode(_component_s_input, {
              modelValue: onChainIdentity.value,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => onChainIdentity.value = $event),
              class: "set-address__input",
              placeholder: unref(t)("addressBook.identity"),
              disabled: ""
            }, null, 8, ["modelValue", "placeholder"]),
            createBaseVNode("div", _hoisted_3$2, [
              createVNode(_component_s_button, {
                type: "primary",
                class: "s-typography-button--large",
                disabled: btnDisabled.value,
                onClick: setContact
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(btnText.value), 1)
                ]),
                _: 1
              }, 8, ["disabled"])
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible", "title", "tooltip"]);
    };
  }
});
const AddressBookContact = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-b5ae4fd1"]]);
const _hoisted_1$1 = {
  key: 0,
  class: "address-book__list"
};
const _hoisted_2$1 = { class: "address-book__sections" };
const _hoisted_3$1 = {
  key: 1,
  class: "address-book__list"
};
const _hoisted_4 = { class: "address-book__sections" };
const _hoisted_5 = {
  key: 2,
  class: "address-book__no-found-records"
};
const _hoisted_6 = {
  key: 1,
  class: "address-book__no-contacts"
};
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  ...{ name: "AddressBookListDialog" },
  __name: "List",
  props: {
    visible: { type: Boolean, default: false },
    accounts: { default: () => [] },
    records: { default: () => [] },
    excludedAddress: { default: "" }
  },
  emits: ["update:visible", "close", "select", "open", "remove"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { isVisible, closeDialog } = useDialogVisibility(toRef(props, "visible"), {
      emit: (value) => emit("update:visible", value),
      onClose: () => emit("close")
    });
    const accountActions = [AccountActionTypes.BookSend];
    const contactActions = [AccountActionTypes.BookSend, AccountActionTypes.BookEdit, AccountActionTypes.BookDelete];
    const search = ref("");
    const identities = reactive({});
    const searchValue = computed(() => search.value ? search.value.trim().toLowerCase() : "");
    const baseRecords = computed(() => props.records ?? []);
    const baseAccounts = computed(() => props.accounts ?? []);
    const formatAccount = (account) => {
      const address = formatAccountAddress(account.address);
      const identity = identities[address];
      return {
        address,
        name: account.name,
        source: account.source,
        identity
      };
    };
    const prepareRecords = (source) => {
      const mapped = source.map(formatAccount);
      const filtered = mapped.filter((record) => record.address !== (props.excludedAddress ?? ""));
      return [...filtered].sort((a, b) => a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1);
    };
    const addressBook = computed(() => prepareRecords(baseRecords.value));
    const accountBook = computed(() => prepareRecords(baseAccounts.value));
    const foundRecords = (records) => {
      if (!searchValue.value) return records;
      return records.filter(({ address = "", name = "", identity }) => {
        const normalizedAddress = address.toLowerCase();
        const normalizedName = name.toLowerCase();
        const identityName = identity?.name?.toLowerCase() ?? "";
        return normalizedAddress === searchValue.value || normalizedName.includes(searchValue.value) || identityName.includes(searchValue.value);
      });
    };
    const addressBookFiltered = computed(() => foundRecords(addressBook.value));
    const accountBookFiltered = computed(() => foundRecords(accountBook.value));
    const userHasContacts = computed(() => Boolean(addressBook.value.length || accountBook.value.length));
    const showNoRecordsFound = computed(() => !(addressBookFiltered.value.length || accountBookFiltered.value.length));
    const resetSearch = () => {
      search.value = "";
    };
    const selectRecord = (record) => {
      emit("select", record);
      closeDialog();
    };
    const setContact = (address, isEditMode = false) => {
      emit("open", address, isEditMode);
    };
    const removeAddressFromBook = (address) => {
      emit("remove", address);
    };
    const updateIdentity = (identity, address) => {
      if (identity) {
        identities[address] = identity;
      } else {
        delete identities[address];
      }
    };
    const handleContactAction = (actionType, { address, name, source }) => {
      switch (actionType) {
        case AccountActionTypes.BookSend:
          selectRecord({ address, name, source });
          break;
        case AccountActionTypes.BookEdit:
          setContact(address, true);
          break;
        case AccountActionTypes.BookDelete:
          removeAddressFromBook(address);
          break;
      }
    };
    return (_ctx, _cache) => {
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      const _component_s_button = resolveComponent("s-button");
      const _directive_button = resolveDirective("button");
      return openBlock(), createBlock(_sfc_main$3, {
        visible: unref(isVisible),
        "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => isRef(isVisible) ? isVisible.value = $event : null),
        title: unref(t)("addressBook.dialogTitle"),
        "append-to-body": ""
      }, {
        default: withCtx(() => [
          userHasContacts.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            createVNode(SearchInput, {
              modelValue: search.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => search.value = $event),
              autofocus: "",
              placeholder: unref(t)("addressBook.searchPlaceholder"),
              maxlength: 100,
              class: "address-book__search",
              onClear: resetSearch
            }, null, 8, ["modelValue", "placeholder"]),
            createVNode(_component_s_scrollbar, { class: "address-book-scrollbar" }, {
              default: withCtx(() => [
                accountBookFiltered.value.length ? (openBlock(), createElementBlock("div", _hoisted_1$1, [
                  createBaseVNode("span", _hoisted_2$1, toDisplayString(unref(t)("addressBook.myAccounts")), 1),
                  (openBlock(true), createElementBlock(Fragment, null, renderList(accountBookFiltered.value, (record, index) => {
                    return withDirectives((openBlock(), createBlock(_sfc_main$4, {
                      key: index,
                      class: "address-book__list-item",
                      "with-identity": "",
                      "polkadot-account": record,
                      onClick: ($event) => selectRecord(record),
                      onIdentity: ($event) => updateIdentity($event, record.address)
                    }, {
                      default: withCtx(() => [
                        createVNode(_sfc_main$5, {
                          actions: accountActions,
                          onSelect: ($event) => handleContactAction($event, record)
                        }, null, 8, ["onSelect"])
                      ]),
                      _: 2
                    }, 1032, ["polkadot-account", "onClick", "onIdentity"])), [
                      [_directive_button]
                    ]);
                  }), 128))
                ])) : createCommentVNode("", true),
                addressBookFiltered.value.length ? (openBlock(), createElementBlock("div", _hoisted_3$1, [
                  createBaseVNode("span", _hoisted_4, toDisplayString(unref(t)("addressBook.myBook")), 1),
                  (openBlock(true), createElementBlock(Fragment, null, renderList(addressBookFiltered.value, (record, index) => {
                    return withDirectives((openBlock(), createBlock(_sfc_main$4, {
                      key: index,
                      class: "address-book__list-item",
                      "with-identity": "",
                      "polkadot-account": record,
                      onClick: ($event) => selectRecord(record)
                    }, {
                      default: withCtx(() => [
                        createVNode(_sfc_main$5, {
                          actions: contactActions,
                          onSelect: ($event) => handleContactAction($event, record)
                        }, null, 8, ["onSelect"])
                      ]),
                      _: 2
                    }, 1032, ["polkadot-account", "onClick"])), [
                      [_directive_button]
                    ]);
                  }), 128))
                ])) : createCommentVNode("", true),
                showNoRecordsFound.value ? (openBlock(), createElementBlock("div", _hoisted_5, toDisplayString(unref(t)("addressBook.noFoundRecords")), 1)) : createCommentVNode("", true)
              ]),
              _: 1
            })
          ], 64)) : (openBlock(), createElementBlock("div", _hoisted_6, toDisplayString(unref(t)("addressBook.noContacts")), 1)),
          createVNode(_component_s_button, {
            class: "address-book__btn s-typography-button--large",
            onClick: _cache[1] || (_cache[1] = ($event) => setContact(null))
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("addressBook.addContact")), 1)
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const AddressBookList = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-980ded23"]]);
const _sfc_main = defineComponent({
  inheritAttrs: false,
  components: {
    WalletAccount: _sfc_main$4,
    AddressBookList,
    AddressBookContact
  },
  mixins: [TranslationMixin],
  props: {
    excludeConnected: {
      default: false,
      type: Boolean
    },
    value: {
      default: "",
      type: String
    },
    propPlaceholder: {
      default: "",
      type: String
    },
    isValid: {
      default: false,
      type: Boolean
    },
    disabled: {
      default: false,
      type: Boolean
    },
    onRemove: {
      required: false,
      type: Function
    },
    canRemove: {
      default: false,
      type: Boolean
    }
  },
  emits: ["input", "update:name"],
  data() {
    return {
      name: "",
      prefilledAddress: "",
      showAddressBookDialog: false,
      showSetContactDialog: false,
      isEditMode: false,
      accountsSubscription: null,
      accountsRecords: []
    };
  },
  computed: {
    ...mapState("wallet/account", {
      connected: "address",
      source: "source",
      addressBook: "book"
    }),
    address: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit("input", value.trim());
      }
    },
    accountBook() {
      return this.accountsRecords.reduce((book, { address, name }) => {
        const key = formatAccountAddress(address);
        return {
          ...book,
          [key]: name
        };
      }, {});
    },
    books() {
      return { ...this.accountBook, ...this.addressBook };
    },
    bookRecords() {
      return Object.entries(this.addressBook ?? {}).map(([address, name]) => ({
        address,
        name,
        source: this.source
      }));
    },
    isNewAddress() {
      if (!this.address) return false;
      const formattedAddress = formatAccountAddress(this.address);
      if (!formattedAddress) return false;
      const found = this.accountsRecords.find(
        (account) => formatAccountAddress(account.address) === formattedAddress
      );
      return !this.addressBook?.[formattedAddress] && !found;
    },
    excludedAddress() {
      return this.excludeConnected ? this.connected : "";
    },
    record() {
      const { address, name, source, isValid } = this;
      return isValid && name ? { address, name, source } : null;
    }
  },
  watch: {
    books() {
      this.updateContactName();
    },
    isValid() {
      this.updateContactName();
    }
  },
  async mounted() {
    this.accountsSubscription = await subscribeToWalletAccounts(api, this.source, (accounts) => {
      this.accountsRecords = accounts;
    });
  },
  beforeUnmount() {
    if (this.accountsSubscription) {
      this.accountsSubscription();
      this.accountsSubscription = null;
    }
  },
  methods: {
    ...mapMutations("wallet/account", ["setAddressToBook", "removeAddressFromBook"]),
    updateContactName() {
      if (!this.isValid) {
        this.name = "";
      } else if (!this.name) {
        const key = formatAccountAddress(this.address);
        this.name = this.books[key] || "";
      }
      this.updateName();
    },
    openAddressBook() {
      this.showAddressBookDialog = true;
    },
    chooseRecord({ name, address }) {
      this.address = address;
      this.name = name;
      this.updateName();
    },
    openContact(address, isEditMode = false) {
      this.isEditMode = isEditMode;
      this.prefilledAddress = address ? formatAccountAddress(address) : "";
      this.showSetContactDialog = true;
    },
    resetAddress() {
      this.address = "";
    },
    updateName() {
      this.$emit("update:name", this.name);
    },
    removeInput() {
      this.onRemove?.();
    }
  }
});
const _hoisted_1 = { class: "address-input" };
const _hoisted_2 = {
  key: 2,
  class: "new-address"
};
const _hoisted_3 = { class: "new-address-msg" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_icon = resolveComponent("s-icon");
  const _component_s_tooltip = resolveComponent("s-tooltip");
  const _component_wallet_account = resolveComponent("wallet-account");
  const _component_s_input = resolveComponent("s-input");
  const _component_address_book_list = resolveComponent("address-book-list");
  const _component_address_book_contact = resolveComponent("address-book-contact");
  const _directive_button = resolveDirective("button");
  return openBlock(), createElementBlock("div", _hoisted_1, [
    _ctx.record ? (openBlock(), createBlock(_component_wallet_account, {
      key: 0,
      "polkadot-account": _ctx.record,
      "with-identity": ""
    }, {
      default: withCtx(() => [
        withDirectives(createVNode(_component_s_icon, {
          class: normalizeClass(["book-icon-unlink", { disabled: _ctx.disabled }]),
          name: "el-icon-close",
          size: "20",
          onClick: _ctx.resetAddress
        }, null, 8, ["class", "onClick"]), [
          [_directive_button]
        ]),
        createVNode(_component_s_tooltip, {
          content: _ctx.t("addressBook.selectContact"),
          "border-radius": "mini",
          placement: "top",
          tabindex: "-1"
        }, {
          default: withCtx(() => [
            withDirectives(createVNode(_component_s_icon, {
              class: normalizeClass(["book-icon-open", { disabled: _ctx.disabled }]),
              name: "basic-user-24",
              size: "18",
              onClick: _ctx.openAddressBook
            }, null, 8, ["class", "onClick"]), [
              [_directive_button]
            ])
          ]),
          _: 1
        }, 8, ["content"])
      ]),
      _: 1
    }, 8, ["polkadot-account"])) : (openBlock(), createBlock(_component_s_input, mergeProps({
      key: 1,
      modelValue: _ctx.address,
      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => _ctx.address = $event)
    }, {
      maxlength: 128,
      disabled: _ctx.disabled,
      placeholder: _ctx.propPlaceholder || _ctx.t("addressBook.input"),
      borderRadius: "medium",
      ..._ctx.$attrs
    }), {
      left: withCtx(() => [
        _ctx.canRemove ? withDirectives((openBlock(), createBlock(_component_s_icon, {
          key: 0,
          class: normalizeClass(["book-icon-unlink", { disabled: _ctx.disabled }]),
          name: "el-icon-close",
          size: "20",
          onClick: _ctx.removeInput
        }, null, 8, ["class", "onClick"])), [
          [_directive_button]
        ]) : createCommentVNode("", true)
      ]),
      right: withCtx(() => [
        _ctx.address ? (openBlock(), createBlock(_component_s_icon, {
          key: 0,
          class: "book-icon-unlink",
          name: "el-icon-close",
          size: "20",
          onClick: _ctx.resetAddress
        }, null, 8, ["onClick"])) : createCommentVNode("", true),
        createVNode(_component_s_tooltip, {
          content: _ctx.t("addressBook.selectContact"),
          "border-radius": "mini",
          placement: "top",
          tabindex: "-1"
        }, {
          default: withCtx(() => [
            withDirectives(createVNode(_component_s_icon, {
              class: normalizeClass(["book-icon-open", { disabled: _ctx.disabled }]),
              name: "basic-user-24",
              size: "18",
              onClick: _ctx.openAddressBook
            }, null, 8, ["class", "onClick"]), [
              [_directive_button]
            ])
          ]),
          _: 1
        }, 8, ["content"])
      ]),
      _: 1
    }, 16, ["modelValue"])),
    _ctx.isNewAddress ? (openBlock(), createElementBlock("div", _hoisted_2, [
      createBaseVNode("span", _hoisted_3, toDisplayString(_ctx.t("addressBook.detected")), 1),
      createBaseVNode("span", {
        class: "new-address-save",
        onClick: _cache[1] || (_cache[1] = ($event) => _ctx.openContact(_ctx.address))
      }, toDisplayString(_ctx.t("addressBook.save")), 1)
    ])) : createCommentVNode("", true),
    createVNode(_component_address_book_list, {
      visible: _ctx.showAddressBookDialog,
      "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => _ctx.showAddressBookDialog = $event),
      accounts: _ctx.accountsRecords,
      records: _ctx.bookRecords,
      "excluded-address": _ctx.excludedAddress,
      onOpen: _ctx.openContact,
      onSelect: _ctx.chooseRecord,
      onRemove: _ctx.removeAddressFromBook
    }, null, 8, ["visible", "accounts", "records", "excluded-address", "onOpen", "onSelect", "onRemove"]),
    createVNode(_component_address_book_contact, {
      visible: _ctx.showSetContactDialog,
      "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => _ctx.showSetContactDialog = $event),
      accounts: _ctx.accountsRecords,
      book: _ctx.addressBook,
      "prefilled-address": _ctx.prefilledAddress,
      "is-edit-mode": _ctx.isEditMode,
      onAdd: _ctx.setAddressToBook
    }, null, 8, ["visible", "accounts", "book", "prefilled-address", "is-edit-mode", "onAdd"])
  ]);
}
const AddressBookInput = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-6e5e03ef"]]);
export {
  AddressBookInput as default
};
