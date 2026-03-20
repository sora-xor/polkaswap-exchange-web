import { aH as gql, aF as getCurrentIndexer, aG as IndexerType, F as FPNumber, z as defineComponent, c4 as ObjectInit, aZ as components, u as useTranslation, U as useLoading, aA as watch, aB as onBeforeUnmount, a_ as resolveComponent, bz as resolveDirective, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, bA as withDirectives, h as computed, bQ as Fragment, ap as createVNode, bP as renderList, aj as unref, D as createBaseVNode, aN as toDisplayString, a9 as ref, aO as createTextVNode, aI as WALLET_CONSTS, d_ as VaultEventTypes, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
const SubqueryVaultDetailsQuery = gql`
  query VaultDetailsQuery($first: Int = null, $offset: Int = null, $filter: VaultEventFilter) {
    data: vaultEvents(first: $first, offset: $offset, filter: $filter, orderBy: [TIMESTAMP_DESC, ID_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          id
          amount
          type
          timestamp
        }
      }
    }
  }
`;
const SubsquidVaultDetailsQuery = gql`
  query VaultDetailsQuery($first: Int = null, $offset: Int = null, $filter: VaultEventWhereInput) {
    info: vaultEventsConnection(first: 0, where: $filter, orderBy: [timestamp_DESC, id_DESC]) {
      totalCount
    }
    nodes: vaultEvents(limit: $first, offset: $offset, where: $filter, orderBy: [timestamp_DESC, id_DESC]) {
      id
      amount
      type
      timestamp
    }
  }
`;
const subqueryVaultEventsFilter = (vaultId, fromTimestamp) => {
  const filter = { vaultId: { equalTo: String(vaultId) } };
  if (fromTimestamp) filter.timestamp = { greaterThan: fromTimestamp };
  return filter;
};
const parseVaultEvents = (event) => {
  return {
    amount: event.amount ? new FPNumber(event.amount) : null,
    timestamp: event.timestamp * 1e3,
    type: event.type
  };
};
async function fetchVaultEvents(variables) {
  const indexer = getCurrentIndexer();
  const { id, first, offset, fromTimestamp } = variables;
  let totalCount = 0;
  let items = [];
  if (!id) return { totalCount, items };
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = subqueryVaultEventsFilter(id, fromTimestamp);
      const variables2 = { first, offset, filter };
      const subqueryIndexer = indexer;
      const response = await subqueryIndexer.services.explorer.fetchEntities(SubqueryVaultDetailsQuery, variables2);
      if (response) {
        totalCount = response.totalCount;
        items = response.edges.map((edge) => parseVaultEvents(edge.node));
      }
      break;
    }
    case IndexerType.SUBSQUID: {
      const filter = subqueryVaultEventsFilter(id, fromTimestamp);
      const variables2 = { first, offset, filter };
      const subsquidIndexer = indexer;
      const response = await subsquidIndexer.services.explorer.fetchEntities(SubsquidVaultDetailsQuery, variables2);
      if (response) {
        totalCount = response.totalCount;
        items = response.nodes.map((edge) => parseVaultEvents(edge));
      }
      break;
    }
  }
  return { totalCount, items };
}
const _hoisted_1 = { class: "details-history__items s-flex-column" };
const _hoisted_2 = { class: "history-item-info s-flex" };
const _hoisted_3 = ["data-type"];
const _hoisted_4 = { class: "history-item-title p4" };
const _hoisted_5 = { class: "history-item-date" };
const _hoisted_6 = {
  key: 1,
  class: "details-history__empty p4"
};
const pageAmount = 5;
const fetchAmount = 5;
const updateInterval = 24e3;
const DateFormat = "ll LT";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "VaultDetailsHistory",
  props: {
    id: { default: void 0 },
    lockedAsset: { default: ObjectInit },
    debtAsset: { default: ObjectInit }
  },
  setup(__props) {
    const HistoryPagination = components.HistoryPagination;
    const props = __props;
    const HiddenValue = WALLET_CONSTS.HiddenValue;
    const currentPage = ref(1);
    const totalCount = ref(0);
    const rawItems = ref([]);
    const intervalId = ref(null);
    const { t, formatDate } = useTranslation();
    const { loading, withLoading } = useLoading();
    const loadingState = computed(() => loading.value);
    const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden ?? false);
    const lockedAssetSymbol = computed(() => props.lockedAsset?.symbol ?? "");
    const debtAssetSymbol = computed(() => props.debtAsset?.symbol ?? "");
    const fetchPage = computed(() => Math.ceil(pageAmount * currentPage.value / fetchAmount));
    const total = computed(() => totalCount.value);
    const lastPage = computed(() => total.value ? Math.ceil(total.value / pageAmount) : 1);
    const hasItems = computed(() => total.value > 0);
    const offset = computed(() => pageAmount * (currentPage.value - 1));
    const dataVariables = computed(() => ({
      id: props.id,
      first: pageAmount,
      offset: offset.value
    }));
    const intervalTimestamp = computed(() => Math.floor((rawItems.value[0]?.timestamp ?? Date.now()) / 1e3));
    const updateVariables = computed(() => ({
      id: props.id,
      fromTimestamp: intervalTimestamp.value
    }));
    const visibleItems = computed(() => {
      const currentFetchPage = fetchPage.value;
      const offsetWithinFetch = fetchAmount * (currentFetchPage - 1);
      const start = Math.max(pageAmount * (currentPage.value - 1) - offsetWithinFetch, 0);
      const end = start + pageAmount;
      return rawItems.value.slice(start, end);
    });
    const items = visibleItems;
    function resetDataSubscription() {
      if (intervalId.value) {
        clearInterval(intervalId.value);
      }
      intervalId.value = null;
    }
    function resetData() {
      rawItems.value = [];
      totalCount.value = 0;
      resetDataSubscription();
    }
    async function applyPageData() {
      if (!props.id) {
        resetData();
        return;
      }
      await withLoading(async () => {
        const { items: fetchedItems, totalCount: count } = await fetchVaultEvents(dataVariables.value);
        rawItems.value = Object.freeze(fetchedItems);
        totalCount.value = count;
      });
      resetDataSubscription();
      if (fetchPage.value === 1 && hasItems.value) {
        intervalId.value = setInterval(async () => {
          try {
            const { items: updates, totalCount: newTotal } = await fetchVaultEvents(updateVariables.value);
            if (updates.length) {
              rawItems.value = Object.freeze([...updates, ...rawItems.value].slice(0, fetchAmount));
            }
            if (newTotal) {
              totalCount.value = totalCount.value + newTotal;
            }
          } catch (error) {
            console.error(error);
          }
        }, updateInterval);
      }
    }
    watch(
      () => props.id,
      (current, previous) => {
        if (current === previous) return;
        currentPage.value = 1;
        resetData();
        applyPageData().catch((error) => console.error(error));
      },
      { immediate: true }
    );
    watch(currentPage, (current, previous) => {
      if (current === previous) return;
      applyPageData().catch((error) => console.error(error));
    });
    watch(lastPage, (value) => {
      if (currentPage.value > value) {
        currentPage.value = value;
      }
    });
    onBeforeUnmount(() => {
      resetDataSubscription();
    });
    const handlePaginationClick = (button) => {
      switch (button) {
        case WALLET_CONSTS.PaginationButton.Prev:
          currentPage.value = Math.max(currentPage.value - 1, 1);
          break;
        case WALLET_CONSTS.PaginationButton.Next:
          currentPage.value = Math.min(currentPage.value + 1, lastPage.value);
          break;
        case WALLET_CONSTS.PaginationButton.Last:
          currentPage.value = lastPage.value;
          break;
        default:
          currentPage.value = 1;
      }
    };
    const getTitle = (type) => {
      switch (type) {
        case VaultEventTypes.Created:
          return t("operations.CreateVault");
        case VaultEventTypes.Closed:
          return t("operations.CloseVault");
        case VaultEventTypes.DebtIncreased:
          return t("operations.BorrowVaultDebt");
        case VaultEventTypes.CollateralDeposit:
          return t("operations.DepositCollateral");
        case VaultEventTypes.DebtPayment:
          return t("operations.RepayVaultDebt");
        case VaultEventTypes.Liquidated:
          return t("kensetsu.liquidated");
        default:
          return "";
      }
    };
    const getAmount = (hidden, item) => {
      return hidden ? HiddenValue : item.amount?.toLocaleString() ?? "";
    };
    const getOperationMessage = (item) => {
      const hidden = shouldBalanceBeHidden.value;
      switch (item.type) {
        case VaultEventTypes.Created:
          return t("operations.finalized.CreateVault", {
            symbol: debtAssetSymbol.value,
            symbol2: lockedAssetSymbol.value
          });
        case VaultEventTypes.Closed:
          return t("operations.finalized.CloseVault", {
            symbol: debtAssetSymbol.value,
            symbol2: lockedAssetSymbol.value
          });
        case VaultEventTypes.DebtIncreased:
          return t("operations.finalized.BorrowVaultDebt", {
            symbol: debtAssetSymbol.value,
            amount: getAmount(hidden, item)
          });
        case VaultEventTypes.CollateralDeposit:
          return t("operations.finalized.DepositCollateral", {
            symbol: lockedAssetSymbol.value,
            amount: getAmount(hidden, item)
          });
        case VaultEventTypes.DebtPayment:
          return t("operations.finalized.RepayVaultDebt", {
            symbol: debtAssetSymbol.value,
            amount: getAmount(hidden, item)
          });
        case VaultEventTypes.Liquidated:
          return t("kensetsu.liquidatedMessage", {
            symbol: lockedAssetSymbol.value,
            amount: getAmount(hidden, item)
          });
        default:
          return "";
      }
    };
    return (_ctx, _cache) => {
      const _component_s_card = resolveComponent("s-card");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createBlock(_component_s_card, {
        class: "details-history",
        "border-radius": "small",
        size: "big",
        primary: ""
      }, {
        header: withCtx(() => [
          createBaseVNode("h4", null, toDisplayString(_ctx.$t("kensetsu.positionHistory")), 1)
        ]),
        default: withCtx(() => [
          hasItems.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(items), (item, index) => {
                return openBlock(), createElementBlock("div", {
                  key: index,
                  class: "history-item s-flex-column"
                }, [
                  createBaseVNode("div", _hoisted_2, [
                    createBaseVNode("div", {
                      class: "history-item-operation ch3",
                      "data-type": item.type
                    }, toDisplayString(getTitle(item.type)), 9, _hoisted_3),
                    createBaseVNode("div", _hoisted_4, toDisplayString(getOperationMessage(item)), 1)
                  ]),
                  createBaseVNode("div", _hoisted_5, toDisplayString(unref(formatDate)(item.timestamp, DateFormat)), 1)
                ]);
              }), 128))
            ])), [
              [_directive_loading, loadingState.value]
            ]),
            createVNode(unref(HistoryPagination), {
              "current-page": currentPage.value,
              "page-amount": pageAmount,
              loading: unref(loading),
              total: total.value,
              "last-page": lastPage.value,
              onPaginationClick: handlePaginationClick
            }, null, 8, ["current-page", "loading", "total", "last-page"])
          ], 64)) : withDirectives((openBlock(), createElementBlock("div", _hoisted_6, [
            createTextVNode(toDisplayString(unref(t)("noDataText")), 1)
          ])), [
            [_directive_loading, loadingState.value]
          ])
        ]),
        _: 1
      });
    };
  }
});
const VaultDetailsHistory = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3050e695"]]);
export {
  VaultDetailsHistory as default
};
