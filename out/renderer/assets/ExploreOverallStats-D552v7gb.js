import { z as defineComponent, aZ as components, u as useTranslation, s as store, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, bQ as Fragment, bP as renderList, h as computed, ap as createVNode, D as createBaseVNode, aN as toDisplayString, aj as unref, aI as WALLET_CONSTS, aO as createTextVNode, bp as formatAmountWithSuffix, F as FPNumber, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = {
  slot: "header",
  class: "stats-card-title"
};
const _hoisted_2 = { class: "stats-card-data" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ExploreOverallStats",
  setup(__props) {
    const FormattedAmount = components.FormattedAmount;
    const FontWeightRate = WALLET_CONSTS.FontWeightRate;
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const { t } = useTranslation();
    const { getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
    const collaterals = computed(() => Object.values(store.state.vault.collaterals));
    const stablecoinInfos = computed(() => store.state.vault.stablecoinInfos);
    const getAsset = store.getters.assets.assetDataByAddress;
    const exchangeRate = computed(() => store.getters.wallet.settings.exchangeRate);
    const currencySymbol = computed(() => store.getters.wallet.settings.currencySymbol);
    const badDebt = computed(
      () => Object.entries(stablecoinInfos.value).reduce((acc, [id, info]) => {
        const debtAsset = getAsset(id);
        if (!debtAsset) return acc;
        const value = getFPNumberFiatAmountByFPNumber(info.badDebt, debtAsset);
        if (!value) return acc;
        return acc.add(value.mul(exchangeRate.value));
      }, FPNumber.ZERO)
    );
    const total = computed(
      () => collaterals.value.reduce(
        (acc, { totalLocked, lockedAssetId, debtSupply, debtAssetId, riskParams: { hardCap } }) => {
          const lockedAsset = getAsset(lockedAssetId);
          if (lockedAsset) {
            const fiatLocked = getFPNumberFiatAmountByFPNumber(totalLocked, lockedAsset);
            if (fiatLocked) {
              acc.collateral = acc.collateral.add(fiatLocked.mul(exchangeRate.value));
            }
          }
          const debtAsset = getAsset(debtAssetId);
          if (debtAsset) {
            const fiatDebt = getFPNumberFiatAmountByFPNumber(debtSupply, debtAsset);
            if (fiatDebt) {
              acc.debt = acc.debt.add(fiatDebt.mul(exchangeRate.value));
            }
            const fiatAvailable = getFPNumberFiatAmountByFPNumber(hardCap.sub(debtSupply), debtAsset);
            if (fiatAvailable) {
              acc.available = acc.available.add(fiatAvailable.mul(exchangeRate.value));
            }
          }
          return acc;
        },
        { debt: FPNumber.ZERO, collateral: FPNumber.ZERO, available: FPNumber.ZERO }
      )
    );
    const columns = computed(() => [
      {
        title: t("kensetsu.overallTotalCollateral"),
        tooltip: t("kensetsu.overallTotalCollateralDescription"),
        amount: total.value.collateral
      },
      {
        title: t("kensetsu.overallTotalDebt"),
        tooltip: t("kensetsu.overallTotalDebtDescription"),
        amount: total.value.debt
      },
      {
        title: t("kensetsu.overallAvailable"),
        tooltip: t("kensetsu.overallAvailableDescription"),
        amount: total.value.available
      },
      {
        title: t("kensetsu.overallBadDebt"),
        tooltip: t("kensetsu.overallBadDebtDescription"),
        amount: badDebt.value
      }
    ]);
    const statsColumns = computed(
      () => columns.value.map(({ amount, title, tooltip }) => ({
        title,
        tooltip,
        value: formatAmountWithSuffix(amount)
      }))
    );
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_card = resolveComponent("s-card");
      const _component_s_col = resolveComponent("s-col");
      const _component_s_row = resolveComponent("s-row");
      return openBlock(), createBlock(_component_s_row, { gutter: 24 }, {
        default: withCtx(() => [
          (openBlock(true), createElementBlock(Fragment, null, renderList(statsColumns.value, ({ title, tooltip, value }) => {
            return openBlock(), createBlock(_component_s_col, {
              key: title,
              class: "stats-column",
              xs: 12,
              sm: 6,
              md: 4,
              lg: 3
            }, {
              default: withCtx(() => [
                createVNode(_component_s_card, {
                  class: "stats-card",
                  size: "small",
                  "border-radius": "mini",
                  primary: ""
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_1, [
                      createBaseVNode("span", null, toDisplayString(title), 1),
                      createVNode(_component_s_tooltip, {
                        "border-radius": "mini",
                        content: tooltip
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_s_icon, {
                            name: "info-16",
                            size: "14px"
                          })
                        ]),
                        _: 1
                      }, 8, ["content"])
                    ]),
                    createBaseVNode("div", _hoisted_2, [
                      createVNode(unref(FormattedAmount), {
                        class: "stats-card-value",
                        "font-weight-rate": unref(FontWeightRate).MEDIUM,
                        "font-size-rate": unref(FontSizeRate).MEDIUM,
                        value: value.amount,
                        "asset-symbol": value.suffix,
                        "symbol-as-decimal": ""
                      }, {
                        prefix: withCtx(() => [
                          createTextVNode(toDisplayString(currencySymbol.value), 1)
                        ]),
                        _: 1
                      }, 8, ["font-weight-rate", "font-size-rate", "value", "asset-symbol"])
                    ])
                  ]),
                  _: 2
                }, 1024)
              ]),
              _: 2
            }, 1024);
          }), 128))
        ]),
        _: 1
      });
    };
  }
});
const ExploreOverallStats = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ab47f2f2"]]);
export {
  ExploreOverallStats as default
};
