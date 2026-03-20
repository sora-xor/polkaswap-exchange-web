import { aF as getCurrentIndexer, aG as IndexerType, bn as retryOnEmptyResult, aH as gql, F as FPNumber, z as defineComponent, ak as lazyComponent, al as Components, aZ as components, a9 as ref, U as useLoading, u as useTranslation, e as useSettingsStore, aA as watch, a4 as onMounted, ab as getCurrentScope, ac as onScopeDispose, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, A as createElementBlock, bQ as Fragment, bP as renderList, h as computed, aM as createCommentVNode, ap as createVNode, aN as toDisplayString, aj as unref, aI as WALLET_CONSTS, as as mergeProps, bq as calcPriceChange, bp as formatAmountWithSuffix, aP as _export_sfc } from "./index-73GArslZ.js";
import { N as NETWORK_STATS_FILTERS, S as SECONDS_IN_TYPE } from "./snapshots-C2HRhynI.js";
const SubqueryStatsQuery = gql`
  query StatsQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          accounts
          transactions
          bridgeIncomingTransactions
          bridgeOutgoingTransactions
        }
      }
    }
  }
`;
const SubsquidStatsQuery = gql`
  query StatsQuery($after: String, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { timestamp_lte: $from }, { timestamp_gte: $to }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          accounts
          transactions
          bridgeIncomingTransactions
          bridgeOutgoingTransactions
        }
      }
    }
  }
`;
const parse = (node) => {
  return {
    timestamp: +node.timestamp * 1e3,
    accounts: new FPNumber(node.accounts),
    transactions: new FPNumber(node.transactions),
    bridgeIncomingTransactions: new FPNumber(node.bridgeIncomingTransactions),
    bridgeOutgoingTransactions: new FPNumber(node.bridgeOutgoingTransactions)
  };
};
async function fetchData(from, to, type) {
  const indexer = getCurrentIndexer();
  let data;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer;
      data = await retryOnEmptyResult(
        async () => subqueryIndexer.services.explorer.fetchAllEntities(SubqueryStatsQuery, { from, to, type }, parse),
        (value) => !value?.length
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer;
      data = await retryOnEmptyResult(
        async () => subsquidIndexer.services.explorer.fetchAllEntitiesConnection(SubsquidStatsQuery, { from, to, type }, parse),
        (value) => !value?.length
      );
      break;
    }
  }
  return data ?? [];
}
const _hoisted_1 = { class: "stats-row" };
const _hoisted_2 = {
  key: 0,
  class: "app-loading-overlay"
};
const _hoisted_3 = {
  slot: "header",
  class: "stats-card-title"
};
const _hoisted_4 = { class: "stats-card-data" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "NetworkStats",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const BaseWidget = lazyComponent(Components.BaseWidget);
    const StatsFilter = lazyComponent(Components.StatsFilter);
    const PriceChange = lazyComponent(Components.PriceChange);
    const { FormattedAmount } = components;
    const props = __props;
    const filters = NETWORK_STATS_FILTERS;
    const filter = ref(filters[0]);
    const currData = ref(null);
    const prevData = ref(null);
    const hasResolvedData = ref(false);
    const parentLoading = computed(() => props.parentLoading);
    const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
    const { t, tc, TranslationConsts } = useTranslation();
    const settingsStore = useSettingsStore();
    const nodeIsConnected = computed(() => settingsStore.nodeIsConnected);
    const loadingState = computed(() => parentLoading.value || loading.value || !hasResolvedData.value);
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const FontWeightRate = WALLET_CONSTS.FontWeightRate;
    const arrow = String.fromCodePoint(8594);
    const columns = computed(() => {
      const { Sora, Ethereum } = TranslationConsts;
      return [
        {
          title: tc("transactionText", 2),
          tooltip: t("tooltips.transactions"),
          prop: "transactions"
        },
        {
          title: t("newAccountsText"),
          tooltip: t("tooltips.accounts"),
          prop: "accounts"
        },
        {
          title: [Ethereum, arrow, Sora].join(" "),
          tooltip: t("tooltips.bridgeTransactions", { from: Ethereum, to: Sora }),
          prop: "bridgeIncomingTransactions"
        },
        {
          title: [Sora, arrow, Ethereum].join(" "),
          tooltip: t("tooltips.bridgeTransactions", { from: Sora, to: Ethereum }),
          prop: "bridgeOutgoingTransactions"
        }
      ];
    });
    const statsColumns = computed(() => {
      return columns.value.map(({ prop, title, tooltip }) => {
        const current = currData.value?.[prop] ?? FPNumber.ZERO;
        const previous = prevData.value?.[prop] ?? FPNumber.ZERO;
        return {
          title,
          tooltip,
          value: formatAmountWithSuffix(current),
          change: calcPriceChange(current, previous)
        };
      });
    });
    const groupData = (data) => {
      return data.reduce((buffer, item) => {
        if (!buffer) return item;
        for (const { prop } of columns.value) {
          buffer[prop] = buffer[prop].add(item[prop]);
        }
        return buffer;
      }, null);
    };
    const updateData = async () => {
      await withLoading(async () => {
        await withParentLoading(async () => {
          try {
            const { type, count } = filter.value;
            const seconds = SECONDS_IN_TYPE[type];
            const now = Math.floor(Date.now() / (seconds * 1e3)) * seconds;
            const aTime = now - seconds * count;
            const bTime = aTime - seconds * count;
            const [current, previous] = await Promise.all([fetchData(now, aTime, type), fetchData(aTime, bTime, type)]);
            currData.value = Object.freeze(groupData(current));
            prevData.value = Object.freeze(groupData(previous));
            hasResolvedData.value = current.length > 0 || previous.length > 0 || nodeIsConnected.value;
          } catch (error) {
            console.error(error);
            hasResolvedData.value = nodeIsConnected.value;
          }
        });
      });
    };
    const changeFilter = (value) => {
      filter.value = value;
      updateData();
    };
    watch(nodeIsConnected, (connected) => {
      if (!connected) {
        hasResolvedData.value = false;
        return;
      }
      if (!hasResolvedData.value) {
        void updateData();
      }
    });
    onMounted(() => {
      void updateData();
    });
    if (getCurrentScope()) {
      onScopeDispose(() => {
        currData.value = null;
        prevData.value = null;
        hasResolvedData.value = false;
      });
    }
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_card = resolveComponent("s-card");
      return openBlock(), createBlock(unref(BaseWidget), mergeProps(_ctx.$attrs, {
        title: unref(t)("networkStatisticsText")
      }), {
        filters: withCtx(() => [
          createVNode(unref(StatsFilter), {
            disabled: loadingState.value,
            filters: unref(filters),
            "model-value": filter.value,
            "onUpdate:modelValue": changeFilter
          }, null, 8, ["disabled", "filters", "model-value"])
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(statsColumns.value, ({ title, tooltip, value, change }) => {
              return openBlock(), createElementBlock("div", {
                key: title,
                class: "stats-column app-loading-overlay__host"
              }, [
                loadingState.value ? (openBlock(), createElementBlock("div", _hoisted_2, [..._cache[0] || (_cache[0] = [
                  createBaseVNode("div", { class: "app-loading-overlay__spinner" }, null, -1)
                ])])) : createCommentVNode("", true),
                createVNode(_component_s_card, {
                  size: "small",
                  "border-radius": "mini"
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_3, [
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
                    createBaseVNode("div", _hoisted_4, [
                      createVNode(unref(FormattedAmount), {
                        class: "stats-card-value",
                        "font-weight-rate": unref(FontWeightRate).MEDIUM,
                        "font-size-rate": unref(FontSizeRate).MEDIUM,
                        value: value.amount,
                        "asset-symbol": value.suffix,
                        "symbol-as-decimal": ""
                      }, null, 8, ["font-weight-rate", "font-size-rate", "value", "asset-symbol"]),
                      createVNode(unref(PriceChange), { value: change }, null, 8, ["value"])
                    ])
                  ]),
                  _: 2
                }, 1024)
              ]);
            }), 128))
          ])
        ]),
        _: 1
      }, 16, ["title"]);
    };
  }
});
const StatsNetworkStats = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-03ecba64"]]);
export {
  StatsNetworkStats as default
};
