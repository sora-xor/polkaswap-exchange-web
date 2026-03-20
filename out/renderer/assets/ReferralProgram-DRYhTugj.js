const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./ReferralBonding-O5AyrfyZ.js","./index-73GArslZ.js","./index-CsTIO-Ll.css","./useFormattedAmount-D-xkdlPs.js","./ReferralBonding-B4e0Biw0.css"])))=>i.map(i=>d[i]);
import { z as defineComponent, aZ as components, dx as createAsyncComponent, u as useTranslation, U as useLoading, G as useInternalConnect, X as XOR, aA as watch, a4 as onMounted, aB as onBeforeUnmount, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, aj as unref, A as createElementBlock, C as openBlock, bQ as Fragment, D as createBaseVNode, aM as createCommentVNode, ap as createVNode, am as createBlock, aN as toDisplayString, h as computed, aI as WALLET_CONSTS, ao as withCtx, aO as createTextVNode, bb as normalizeClass, an as createSlots, bP as renderList, a9 as ref, aq as withModifiers, bM as __vitePreload, s as store, Z as ZeroStringValue, F as FPNumber, dt as formatAddress, b2 as sanitizeHtml, ay as api, dy as getRouterMode, W as router, dm as escapeHtml, V as PageNames, dz as getFullBaseUrl, bo as last, ct as tmaSdkService, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useCopyAddress } from "./useCopyAddress-CJeOU9NK.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "referral-program" };
const _hoisted_2 = { class: "rewards-container" };
const _hoisted_3 = { class: "rewards-title" };
const _hoisted_4 = {
  key: 0,
  class: "referral-insufficient-bonded-amount"
};
const _hoisted_5 = { class: "referral-link-details with-text" };
const _hoisted_6 = { class: "referral-link-label" };
const _hoisted_7 = ["innerHTML"];
const _hoisted_8 = { class: "bonded-collapse-title" };
const _hoisted_9 = {
  key: 0,
  class: "unbonded-info"
};
const _hoisted_10 = ["innerHTML"];
const _hoisted_11 = { class: "bonded--buttons" };
const _hoisted_12 = { class: "invited-users-collapse-title" };
const _hoisted_13 = { class: "referrer-collapse-title" };
const _hoisted_14 = ["innerHTML"];
const _hoisted_15 = { class: "referrer-link-details" };
const _hoisted_16 = ["innerHTML"];
const _hoisted_17 = { class: "referrer-link-details with-text" };
const _hoisted_18 = { class: "referral-link-label" };
const _hoisted_19 = ["innerHTML"];
const _hoisted_20 = ["innerHTML"];
const pageAmount = 5;
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      FormattedAmount: components.FormattedAmount,
      FormattedAddress: components.FormattedAddress,
      InfoLine: components.InfoLine,
      ReferralBonding: createAsyncComponent(() => __vitePreload(() => import("./ReferralBonding-O5AyrfyZ.js"), true ? __vite__mapDeps([0,1,2,3,4]) : void 0, import.meta.url)),
      WalletAvatar: components.WalletAvatar,
      TokenLogo: components.TokenLogo
    }
  },
  __name: "ReferralProgram",
  setup(__props) {
    const WALLET_CONSTS$1 = WALLET_CONSTS;
    const FontSizeRate = WALLET_CONSTS$1.FontSizeRate;
    WALLET_CONSTS$1.FontWeightRate;
    const { t } = useTranslation();
    const { loading, withApi } = useLoading();
    const { connectSoraWallet, isLoggedIn } = useInternalConnect();
    const { handleCopyAddress, copyTooltip } = useCopyAddress();
    const {
      Zero,
      formatCodecNumber,
      getAssetFiatPrice,
      getFiatAmountByFPNumber,
      getFiatAmountByCodecString,
      getFPNumberFromCodec
    } = useFormattedAmount();
    const referralRewards = computed(() => store.state.referrals.referralRewards);
    const invitedUsers = computed(() => store.state.referrals.invitedUsers ?? []);
    const referrer = computed(() => store.state.referrals.referrer);
    const isReferrerApproved = computed(() => Boolean(store.state.referrals.isReferrerApproved));
    const isTMA = computed(() => Boolean(store.state.settings.isTMA));
    const telegramBotUrl = computed(() => store.state.settings.telegramBotUrl);
    const xor = computed(() => store.getters.assets.xor);
    const account = computed(() => store.getters.wallet.account.account);
    const networkFees = computed(
      () => store.state.wallet.settings.networkFees ?? {}
    );
    const referrerLinkOrCode = ref("");
    const currentPage = ref(1);
    const startIndex = computed(() => (currentPage.value - 1) * pageAmount);
    const endIndex = computed(() => currentPage.value * pageAmount);
    const invitedUsersCount = computed(() => invitedUsers.value.length);
    const hasMultipleInvitedUsersPages = computed(() => invitedUsersCount.value > pageAmount);
    const filteredInvitedUsers = computed(() => invitedUsers.value.slice(startIndex.value, endIndex.value));
    const bondedXorCodecBalance = computed(() => xor.value?.balance?.bonded ?? "");
    const inviteUserFee = computed(() => {
      const fee = networkFees.value?.ReferralSetInvitedUser;
      return fee ? formatCodecNumber(fee) : ZeroStringValue;
    });
    const isInsufficientBondedAmount = computed(() => {
      const fee = networkFees.value?.ReferralSetInvitedUser;
      if (!bondedXorCodecBalance.value || !fee) return false;
      return FPNumber.gt(getFPNumberFromCodec(fee), getFPNumberFromCodec(bondedXorCodecBalance.value));
    });
    const formattedBondedXorBalance = computed(
      () => bondedXorCodecBalance.value ? formatCodecNumber(bondedXorCodecBalance.value) : ZeroStringValue
    );
    const formattedBondedXorFiatValue = computed(
      () => bondedXorCodecBalance.value ? getFiatAmountByCodecString(bondedXorCodecBalance.value) : null
    );
    const hasAccountWithBondedXor = computed(() => {
      const bonded = bondedXorCodecBalance.value;
      return Boolean(account.value && bonded && !FPNumber.fromCodecValue(bonded).isZero());
    });
    const bondedContainerClasses = computed(() => {
      const baseClass = "bonded-container";
      const classes = [baseClass];
      if (!hasAccountWithBondedXor.value) {
        classes.push("is-active", `${baseClass}--visible-content`);
      }
      return classes;
    });
    const invitedUserRewards = computed(() => referralRewards.value?.invitedUserRewards ?? {});
    const formattedRewards = computed(() => referralRewards.value?.rewards.toLocaleString() ?? ZeroStringValue);
    const formattedRewardsFiatValue = computed(
      () => referralRewards.value?.rewards ? getFiatAmountByFPNumber(referralRewards.value.rewards) : null
    );
    const xorSymbol = XOR.symbol;
    const linkHrefBase = computed(() => `${getFullBaseUrl(router)}referral/`);
    const referrerFormatted = computed(() => referrer.value ? formatAddress(referrer.value, 8) : "");
    const isReferrerLinkEmpty = computed(() => referrerLinkOrCode.value.trim().length === 0);
    const referrerAddress = computed(() => {
      if (referrer.value) return referrer.value;
      return last(referrerLinkOrCode.value.split("/")) ?? "";
    });
    const hasTMALink = computed(() => isTMA.value && Boolean(telegramBotUrl.value));
    const refLinkTooltip = computed(
      () => hasTMALink.value ? t("referralProgram.inviteViaTelegram") : copyTooltip(t("referralProgram.invitationLink"))
    );
    const connectAccountHtml = computed(
      () => sanitizeHtml(t("referralProgram.connectAccount"), {
        allowedTags: ["a", "span", "strong", "em", "p", "br"],
        allowedAttributes: {
          "*": ["class"],
          a: ["href", "rel", "target", "title"]
        }
      })
    );
    const startInvitingHtml = computed(
      () => sanitizeHtml(t("referralProgram.startInviting"), {
        allowedTags: ["a", "span", "strong", "em", "p", "br"],
        allowedAttributes: {
          "*": ["class"],
          a: ["href", "rel", "target", "title"]
        }
      })
    );
    const referrerInfoHtml = computed(
      () => sanitizeHtml(t("referralProgram.referrer.info"), {
        allowedTags: ["a", "span", "strong", "em", "p", "br", "ul", "li"],
        allowedAttributes: {
          "*": ["class"],
          a: ["href", "rel", "target", "title"]
        }
      })
    );
    const referrerDescriptionHtml = computed(
      () => sanitizeHtml(t("referralProgram.referrer.description"), {
        allowedTags: ["a", "span", "strong", "em", "p", "br", "ul", "li"],
        allowedAttributes: {
          "*": ["class"],
          a: ["href", "rel", "target", "title"]
        }
      })
    );
    const referralLink = computed(() => {
      const address = account.value?.address ?? "";
      const href = getSafeReferralLinkHref(address);
      const label = getLinkLabel(address);
      return { href, label };
    });
    const referrerLink = computed(() => {
      const address = referrerAddress.value;
      return {
        href: getSafeReferralLinkHref(address),
        label: getLinkLabel(address)
      };
    });
    const refLinkText = computed(
      () => hasTMALink.value ? t("referralProgram.action.shareLink") : t("referralProgram.action.copyLink")
    );
    const invitedUsersClasses = computed(() => {
      const baseClass = "invited-users-list";
      return hasMultipleInvitedUsersPages.value ? [baseClass, `${baseClass}--multiple-pages`] : [baseClass];
    });
    const bondButtonType = computed(() => hasAccountWithBondedXor.value ? "secondary" : "primary");
    const handlePrevClick = (page) => {
      currentPage.value = page;
    };
    const handleNextClick = (page) => {
      currentPage.value = page;
    };
    const isValidReferrerLink = computed(() => {
      if (isReferrerLinkEmpty.value) return false;
      const address = referrerAddress.value;
      if (!api.validateAddress(address)) return false;
      if (api.formatAddress(address) === account.value?.address) return false;
      if (referrerLinkOrCode.value === address) return true;
      return referrerLinkOrCode.value === referrerLink.value.href;
    });
    const tmaShareLink = () => {
      if (!telegramBotUrl.value || !account.value?.address) return;
      const botUrl = `${telegramBotUrl.value}/app?startapp=${account.value.address}`;
      tmaSdkService.shareLink(botUrl, t("referralProgram.welcomeMessage"));
    };
    const handleClickRefLink = (event) => {
      if (!hasTMALink.value) {
        void handleCopyAddress(referralLink.value.href, event);
        return;
      }
      tmaShareLink();
    };
    const getLinkLabel = (address) => {
      const routerMode = getRouterMode(router);
      const safeAddress = escapeHtml(address);
      const raw = `<span class="referral-link-address">Polkaswap.io/</span>${routerMode}referral/${safeAddress}`;
      return sanitizeHtml(raw, {
        allowedTags: ["span"],
        allowedAttributes: {
          span: ["class"]
        }
      });
    };
    const getSafeReferralLinkHref = (address) => {
      const safeAddress = escapeHtml(address);
      return `${linkHrefBase.value}${safeAddress}`;
    };
    const getInvitedUserReward = (invitedUser) => {
      const rewards = invitedUserRewards.value[invitedUser];
      if (typeof invitedUser === "string" && rewards) {
        return formatCodecNumber(rewards.toCodecString());
      }
      return ZeroStringValue;
    };
    const handleBonding = (isBond = false) => {
      router.push({ name: isBond ? PageNames.ReferralBonding : PageNames.ReferralUnbonding });
    };
    const handleSetReferrer = () => {
      if (!isValidReferrerLink.value) return;
      store.commit.referrals.setStorageReferrer(referrerAddress.value);
    };
    const resetSubscriptions = () => {
      store.commit.referrals.unsubscribeFromInvitedUsers();
      store.commit.referrals.resetReferrerSubscription();
    };
    const resetState = () => {
      store.commit.referrals.reset();
    };
    const initData = async () => {
      if (!isLoggedIn.value) return;
      await store.dispatch.referrals.subscribeOnInvitedUsers();
      await store.dispatch.referrals.getAccountReferralRewards();
      await store.dispatch.referrals.getReferrer();
      await store.dispatch.referrals.subscribeOnReferrer();
    };
    watch(isLoggedIn, async (value) => {
      if (value) {
        await initData();
      } else {
        resetSubscriptions();
      }
    });
    onMounted(() => {
      void withApi(async () => {
        await initData();
      });
    });
    onBeforeUnmount(() => {
      resetSubscriptions();
      resetState();
    });
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_card = resolveComponent("s-card");
      const _component_info_line = resolveComponent("info-line");
      const _component_s_collapse_item = resolveComponent("s-collapse-item");
      const _component_formatted_address = resolveComponent("formatted-address");
      const _component_s_pagination = resolveComponent("s-pagination");
      const _component_WalletAvatar = resolveComponent("WalletAvatar");
      const _component_s_input = resolveComponent("s-input");
      const _component_s_collapse = resolveComponent("s-collapse");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
        unref(isLoggedIn) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("span", _hoisted_3, toDisplayString(unref(t)("referralProgram.receivedRewards")), 1),
            createVNode(_component_token_logo, {
              token: xor.value,
              size: unref(WALLET_CONSTS$1).LogoSize.BIGGER
            }, null, 8, ["token", "size"]),
            createVNode(_component_formatted_amount, {
              class: "rewards-value",
              "value-can-be-hidden": "",
              "font-size-rate": unref(FontSizeRate).SMALL,
              "symbol-as-decimal": "",
              value: formattedRewards.value,
              "asset-symbol": unref(xorSymbol)
            }, null, 8, ["font-size-rate", "value", "asset-symbol"]),
            formattedRewardsFiatValue.value ? (openBlock(), createBlock(_component_formatted_amount, {
              key: 0,
              "is-fiat-value": "",
              "fiat-default-rounding": "",
              "value-can-be-hidden": "",
              "font-size-rate": unref(FontSizeRate).MEDIUM,
              value: formattedRewardsFiatValue.value,
              "is-formatted": ""
            }, null, 8, ["font-size-rate", "value"])) : createCommentVNode("", true)
          ]),
          hasAccountWithBondedXor.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            isInsufficientBondedAmount.value ? (openBlock(), createElementBlock("div", _hoisted_4, toDisplayString(unref(t)("referralProgram.insufficientBondedAmount", { inviteUserFee: inviteUserFee.value })), 1)) : (openBlock(), createBlock(_component_s_card, {
              key: 1,
              class: "referral-link-container",
              shadow: "always",
              size: "small",
              "border-radius": "medium"
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_5, [
                  createBaseVNode("div", _hoisted_6, toDisplayString(unref(t)("referralProgram.invitationLink")), 1),
                  createBaseVNode("div", {
                    class: "referral-link",
                    innerHTML: referralLink.value.label
                  }, null, 8, _hoisted_7)
                ]),
                createVNode(_component_s_button, {
                  class: "s-typography-button--mini",
                  size: "small",
                  type: "primary",
                  tooltip: refLinkTooltip.value,
                  onClick: _cache[0] || (_cache[0] = ($event) => handleClickRefLink($event))
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(refLinkText.value) + " ", 1),
                    createVNode(_component_s_icon, {
                      name: "copy-16",
                      size: "16"
                    })
                  ]),
                  _: 1
                }, 8, ["tooltip"])
              ]),
              _: 1
            }))
          ], 64)) : createCommentVNode("", true),
          createVNode(_component_s_collapse, { borders: true }, {
            default: withCtx(() => [
              createVNode(_component_s_collapse_item, {
                class: normalizeClass(bondedContainerClasses.value),
                disabled: !hasAccountWithBondedXor.value,
                name: "bondedXOR"
              }, createSlots({
                default: withCtx(() => [
                  !hasAccountWithBondedXor.value ? (openBlock(), createElementBlock("div", _hoisted_9, [
                    createVNode(_component_token_logo, { token: xor.value }, null, 8, ["token"]),
                    createBaseVNode("p", {
                      class: "referral-program-hint referral-program-hint--connected",
                      innerHTML: startInvitingHtml.value
                    }, null, 8, _hoisted_10)
                  ])) : createCommentVNode("", true),
                  createVNode(_component_info_line, {
                    "is-formatted": "",
                    "value-can-be-hidden": "",
                    label: unref(t)("referralProgram.bondedXOR"),
                    value: formattedBondedXorBalance.value,
                    "fiat-value": formattedBondedXorFiatValue.value
                  }, null, 8, ["label", "value", "fiat-value"]),
                  createBaseVNode("div", _hoisted_11, [
                    createVNode(_component_s_button, {
                      type: bondButtonType.value,
                      class: "s-typography-button--medium",
                      onClick: _cache[1] || (_cache[1] = ($event) => handleBonding(true))
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(unref(t)("referralProgram.action.bondMore")), 1)
                      ]),
                      _: 1
                    }, 8, ["type"]),
                    hasAccountWithBondedXor.value ? (openBlock(), createBlock(_component_s_button, {
                      key: 0,
                      type: "secondary",
                      class: "s-typography-button--medium",
                      onClick: _cache[2] || (_cache[2] = ($event) => handleBonding())
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(unref(t)("referralProgram.action.unbond")), 1)
                      ]),
                      _: 1
                    })) : createCommentVNode("", true)
                  ])
                ]),
                _: 2
              }, [
                hasAccountWithBondedXor.value ? {
                  name: "title",
                  fn: withCtx(() => [
                    createVNode(_component_token_logo, { token: xor.value }, null, 8, ["token"]),
                    createBaseVNode("h3", _hoisted_8, toDisplayString(unref(t)("referralProgram.bondedXOR")), 1)
                  ]),
                  key: "0"
                } : void 0
              ]), 1032, ["class", "disabled"]),
              invitedUsersCount.value ? (openBlock(), createBlock(_component_s_collapse_item, {
                key: 0,
                class: "invited-users-container",
                name: "invitedUsers"
              }, {
                title: withCtx(() => [
                  _cache[5] || (_cache[5] = createBaseVNode("span", { class: "invited-users-icon" }, null, -1)),
                  createBaseVNode("h3", _hoisted_12, toDisplayString(unref(t)("referralProgram.referralsNumber", { number: invitedUsersCount.value })), 1)
                ]),
                default: withCtx(() => [
                  invitedUsersCount.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    createBaseVNode("div", {
                      class: normalizeClass(invitedUsersClasses.value)
                    }, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(filteredInvitedUsers.value, (invitedUser) => {
                        return openBlock(), createBlock(_component_info_line, {
                          "value-can-be-hidden": "",
                          key: invitedUser,
                          value: getInvitedUserReward(invitedUser),
                          "asset-symbol": unref(xorSymbol),
                          "is-formatted": ""
                        }, {
                          "info-line-prefix": withCtx(() => [
                            createVNode(_component_formatted_address, {
                              value: invitedUser,
                              "tooltip-text": unref(t)("transaction.referral")
                            }, null, 8, ["value", "tooltip-text"])
                          ]),
                          _: 2
                        }, 1032, ["value", "asset-symbol"]);
                      }), 128))
                    ], 2),
                    hasMultipleInvitedUsersPages.value ? (openBlock(), createBlock(_component_s_pagination, {
                      key: 0,
                      layout: "total, prev, next",
                      "current-page": currentPage.value,
                      "onUpdate:currentPage": _cache[3] || (_cache[3] = ($event) => currentPage.value = $event),
                      "page-size": pageAmount,
                      total: invitedUsersCount.value,
                      onPrevClick: handlePrevClick,
                      onNextClick: handleNextClick
                    }, null, 8, ["current-page", "total"])) : createCommentVNode("", true)
                  ], 64)) : createCommentVNode("", true)
                ]),
                _: 1
              })) : createCommentVNode("", true),
              createVNode(_component_s_collapse_item, {
                class: "referrer-link-container",
                name: "referrer"
              }, {
                title: withCtx(() => [
                  referrer.value ? (openBlock(), createBlock(_component_WalletAvatar, {
                    key: 0,
                    class: "referrer-icon",
                    size: 32,
                    address: referrer.value
                  }, null, 8, ["address"])) : createCommentVNode("", true),
                  createBaseVNode("h3", _hoisted_13, toDisplayString(unref(t)(`referralProgram.referrer.${referrer.value ? "titleReferrer" : "title"}`)), 1)
                ]),
                default: withCtx(() => [
                  referrer.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    createBaseVNode("h5", null, toDisplayString(unref(t)("referralProgram.referrer.referredBy", { referrer: referrerFormatted.value })), 1),
                    createBaseVNode("p", {
                      class: "referrer-description",
                      innerHTML: referrerInfoHtml.value
                    }, null, 8, _hoisted_14)
                  ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                    createBaseVNode("div", _hoisted_15, [
                      createVNode(_component_s_input, {
                        class: "referrer-link-code",
                        placeholder: unref(t)(`referralProgram.referrer.${isReferrerLinkEmpty.value ? "placeholder" : "label"}`),
                        modelValue: referrerLinkOrCode.value,
                        "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => referrerLinkOrCode.value = $event)
                      }, {
                        right: withCtx(() => [
                          !isReferrerLinkEmpty.value ? (openBlock(), createBlock(_component_s_button, {
                            key: 0,
                            class: "s-typography-button--mini s-button--approve",
                            size: "small",
                            type: "primary",
                            disabled: !isValidReferrerLink.value || isReferrerApproved.value,
                            onClick: withModifiers(handleSetReferrer, ["stop"])
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(unref(t)(`referralProgram.referrer.${isReferrerApproved.value ? "approved" : "approve"}`)), 1)
                            ]),
                            _: 1
                          }, 8, ["disabled"])) : createCommentVNode("", true)
                        ]),
                        _: 1
                      }, 8, ["placeholder", "modelValue"])
                    ]),
                    createBaseVNode("p", {
                      class: "referrer-description",
                      innerHTML: referrerDescriptionHtml.value
                    }, null, 8, _hoisted_16)
                  ], 64)),
                  referrer.value ? (openBlock(), createBlock(_component_s_card, {
                    key: 2,
                    shadow: "always",
                    size: "small",
                    "border-radius": "medium"
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_17, [
                        createBaseVNode("div", _hoisted_18, toDisplayString(unref(t)("referralProgram.referrer.referredLablel")), 1),
                        createBaseVNode("div", {
                          class: "referral-link",
                          innerHTML: referrerLink.value.label
                        }, null, 8, _hoisted_19)
                      ])
                    ]),
                    _: 1
                  })) : createCommentVNode("", true)
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createBaseVNode("p", {
            class: "referral-program-hint",
            innerHTML: connectAccountHtml.value
          }, null, 8, _hoisted_20),
          !unref(isLoggedIn) ? (openBlock(), createBlock(_component_s_button, {
            key: 0,
            class: "connect-button s-typography-button--large",
            type: "primary",
            onClick: unref(connectSoraWallet)
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
            ]),
            _: 1
          }, 8, ["onClick"])) : createCommentVNode("", true)
        ], 64))
      ])), [
        [_directive_loading, unref(loading)]
      ]);
    };
  }
});
const ReferralProgram = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ede00cf1"]]);
export {
  ReferralProgram as default
};
