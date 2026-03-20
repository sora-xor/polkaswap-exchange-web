import { z as defineComponent, aZ as components, ak as lazyComponent, al as Components, u as useTranslation, e as useSettingsStore, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, h as computed, aI as WALLET_CONSTS, ce as capitalize, cf as ConnectionStatus, s as store } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ name: "SelectIndexerDialog" },
  __name: "StatisticsDialog",
  setup(__props) {
    const DialogBase = components.DialogBase;
    const SelectIndexer = lazyComponent(Components.SelectIndexer);
    const { t } = useTranslation();
    const settingsStore = useSettingsStore();
    const walletSettingsState = computed(() => store.state.wallet?.settings ?? {});
    const visibility = computed({
      get: () => Boolean(settingsStore.selectIndexerDialogVisibility),
      set: (flag) => {
        settingsStore.setSelectIndexerDialogVisibility(flag);
      }
    });
    const soraNetwork = computed(
      () => walletSettingsState.value.soraNetwork
    );
    const indexers = computed(() => {
      const indexersData = walletSettingsState.value.indexers;
      return Object.values(WALLET_CONSTS.IndexerType).map((type) => {
        const data = indexersData?.[type] ?? {};
        return {
          name: capitalize(type),
          type,
          endpoint: data.endpoint ?? "",
          online: data.status === ConnectionStatus.Available
        };
      });
    });
    const selectedIndexerType = computed({
      get: () => walletSettingsState.value.indexerType ?? "",
      set: async (type) => {
        if (!type || type === walletSettingsState.value.indexerType) return;
        const selectIndexer = store.dispatch?.wallet?.settings?.selectIndexer;
        if (typeof selectIndexer === "function") {
          await selectIndexer(type);
        }
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(DialogBase), {
        visible: visibility.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => visibility.value = $event),
        title: unref(t)("footer.statistics.dialog.title"),
        class: "select-indexer-dialog"
      }, {
        default: withCtx(() => [
          createVNode(unref(SelectIndexer), {
            indexer: selectedIndexerType.value,
            "onUpdate:indexer": _cache[0] || (_cache[0] = ($event) => selectedIndexerType.value = $event),
            indexers: indexers.value,
            environment: soraNetwork.value
          }, null, 8, ["indexer", "indexers", "environment"])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
export {
  _sfc_main as default
};
