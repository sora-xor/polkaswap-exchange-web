import { z as defineComponent, bF as useAttrs, au as useRouter, at as useRoute, c_ as soraStakingLazyComponent, c$ as SoraStakingComponents, s as store, aA as watch, a4 as onMounted, d0 as SoraStakingPageNames, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, as as mergeProps, h as computed, aj as unref } from "./index-73GArslZ.js";
import { u as useSubscriptions } from "./useSubscriptions-B0wmcRcn.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ inheritAttrs: false },
  __name: "DataContainer",
  props: {
    parentLoading: { type: Boolean }
  },
  setup(__props) {
    const props = __props;
    const attrs = useAttrs();
    const router = useRouter();
    const route = useRoute();
    const {
      validatorsFilter,
      showValidatorsFilterDialog,
      setValidatorsFilter,
      setShowValidatorsFilterDialog,
      newStakeValidatorsMode,
      currentEra
    } = useSoraStaking();
    const ValidatorsFilterDialog = soraStakingLazyComponent(SoraStakingComponents.ValidatorsFilterDialog);
    const parentLoadingFlag = computed(() => Boolean(props.parentLoading));
    const stakingDispatch = store.dispatch.staking;
    const stakingCommit = store.commit.staking;
    const getStakingInfo = () => stakingDispatch.getStakingInfo();
    const getValidatorsInfo = () => stakingDispatch.getValidatorsInfo();
    const getMinNominatorBond = () => stakingDispatch.getMinNominatorBond();
    const getUnbondPeriod = () => stakingDispatch.getUnbondPeriod();
    const getMaxNominations = () => stakingDispatch.getMaxNominations();
    const getHistoryDepth = () => stakingDispatch.getHistoryDepth();
    const getPendingRewards = () => stakingDispatch.getPendingRewards();
    const subscribeOnActiveEra = () => stakingDispatch.subscribeOnActiveEra();
    const subscribeOnCurrentEra = () => stakingDispatch.subscribeOnCurrentEra();
    const subscribeOnController = () => stakingDispatch.subscribeOnController();
    const subscribeOnPayee = () => stakingDispatch.subscribeOnPayee();
    const subscribeOnNominations = () => stakingDispatch.subscribeOnNominations();
    const subscribeOnAccountLedger = () => stakingDispatch.subscribeOnAccountLedger();
    const subscribeOnCurrentEraTotalStake = () => stakingDispatch.subscribeOnCurrentEraTotalStake();
    const startStakingSubscriptions = async () => {
      await Promise.all([
        getStakingInfo(),
        getValidatorsInfo(),
        getMinNominatorBond(),
        getUnbondPeriod(),
        getMaxNominations(),
        getHistoryDepth(),
        getPendingRewards(),
        subscribeOnActiveEra(),
        subscribeOnCurrentEra(),
        subscribeOnController(),
        subscribeOnPayee(),
        subscribeOnNominations(),
        subscribeOnAccountLedger()
      ]);
      await subscribeOnCurrentEraTotalStake();
    };
    const resetStakingSubscriptions = async () => {
      stakingCommit.resetActiveEraUpdates();
      stakingCommit.resetCurrentEraUpdates();
      stakingCommit.resetCurrentEraTotalStakeUpdates();
      stakingCommit.resetControllerUpdates();
      stakingCommit.resetPayeeUpdates();
      stakingCommit.resetNominationsUpdates();
      stakingCommit.resetAccountLedgerUpdates();
    };
    const { loading, subscriptionsDataLoading, updateSubscriptions } = useSubscriptions({
      parentLoading: parentLoadingFlag,
      startSubscriptions: [startStakingSubscriptions],
      resetSubscriptions: [resetStakingSubscriptions],
      autoStart: false
    });
    const showFilterDialog = computed({
      get: () => showValidatorsFilterDialog.value,
      set: (value) => setShowValidatorsFilterDialog(value)
    });
    const dialogParentLoading = computed(() => parentLoadingFlag.value || loading.value);
    const routerViewBindings = computed(() => ({
      ...attrs,
      parentLoading: subscriptionsDataLoading.value
    }));
    const handleChangeFilter = (filter) => {
      setShowValidatorsFilterDialog(false);
      setValidatorsFilter(filter);
    };
    watch(
      () => currentEra.value,
      (era, previous) => {
        if (era === previous || era === void 0 || era === null) return;
        void subscribeOnCurrentEraTotalStake();
      }
    );
    onMounted(async () => {
      if (!newStakeValidatorsMode.value && route.name !== SoraStakingPageNames.Overview) {
        router.push({ name: SoraStakingPageNames.Overview });
      }
      await updateSubscriptions();
    });
    return (_ctx, _cache) => {
      const _component_router_view = resolveComponent("router-view");
      return openBlock(), createElementBlock("div", null, [
        createVNode(_component_router_view, mergeProps({ class: "sora-staking-container" }, routerViewBindings.value), null, 16),
        createVNode(unref(ValidatorsFilterDialog), {
          visible: showFilterDialog.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => showFilterDialog.value = $event),
          "parent-loading": dialogParentLoading.value,
          filter: unref(validatorsFilter),
          onSave: handleChangeFilter
        }, null, 8, ["visible", "parent-loading", "filter"])
      ]);
    };
  }
});
export {
  _sfc_main as default
};
