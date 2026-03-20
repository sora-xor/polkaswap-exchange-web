import { z as defineComponent, P as useRouterStore, v as useWalletStore, au as useRouter, at as useRoute, a4 as onMounted, av as onBeforeRouteUpdate, aA as watch, h as computed, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, a9 as ref, am as createBlock, C as openBlock, F as FPNumber, s as store, aI as WALLET_CONSTS, V as PageNames, ay as api, X as XOR } from "./index-73GArslZ.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Wallet",
  setup(__props) {
    const routerStore = useRouterStore();
    const swapStore = useSwapStore();
    const walletStore = useWalletStore();
    const vueRouter = useRouter();
    const route = useRoute();
    const parentLoading = ref(false);
    const isLoggedIn = computed(() => walletStore.isLoggedIn);
    const whitelist = computed(() => walletStore.whitelist);
    const whitelistIdsBySymbol = computed(() => walletStore.whitelistIdsBySymbol);
    const getAsset = (address) => store.getters.assets.assetDataByAddress(address);
    const setSwapFromAsset = (address) => swapStore.setTokenFromAddress(address);
    const setSwapToAsset = () => swapStore.setTokenToAddress();
    const setAddliquidityAssetA = (address) => store.dispatch.addLiquidity.setFirstTokenAddress(address);
    const ensureWalletRoute = () => {
      routerStore.checkCurrentRoute();
    };
    const tryNavigate = () => {
      try {
        if (!isLoggedIn.value) return;
        const page = route.query.page;
        if (page !== "send") return;
        const to = route.query.to;
        const amountQuery = route.query.amount;
        const amount = typeof amountQuery === "string" ? new FPNumber(amountQuery || 0).toString() : void 0;
        const assetId = whitelistIdsBySymbol.value[route.query.asset?.toUpperCase()];
        if (!assetId) return;
        const asset = getAsset(assetId);
        routerStore.navigate({
          name: WALLET_CONSTS.RouteNames.WalletSend,
          params: { address: to, amount, asset }
        });
      } catch (error) {
        console.warn("[WALLET] Navigate issue:", error);
      }
    };
    onMounted(() => {
      ensureWalletRoute();
      tryNavigate();
    });
    onBeforeRouteUpdate((to, from, next) => {
      next();
      ensureWalletRoute();
      tryNavigate();
    });
    watch(
      () => ({
        isLoggedIn: isLoggedIn.value,
        page: route.query.page,
        asset: route.query.asset,
        to: route.query.to,
        amount: route.query.amount,
        whitelistSize: Object.keys(whitelistIdsBySymbol.value ?? {}).length
      }),
      () => {
        tryNavigate();
      }
    );
    const handleClose = () => {
      vueRouter.back();
    };
    const handleSwap = async (asset) => {
      try {
        setSwapFromAsset(asset?.address);
        setSwapToAsset();
      } catch (error) {
        console.warn("[WALLET] Swap setup issue:", error);
      }
      await vueRouter.push({ name: PageNames.Swap });
    };
    const handleLiquidity = async (asset) => {
      if (api.dex.baseAssetsIds.includes(asset.address)) {
        setAddliquidityAssetA(asset.address);
        vueRouter.push({ name: PageNames.AddLiquidity });
        return;
      }
      const assetAAddress = XOR.address;
      const assetBAddress = asset.address;
      const first = whitelist.value[assetAAddress]?.symbol ?? assetAAddress;
      const second = whitelist.value[assetBAddress]?.symbol ?? assetBAddress;
      const params = { first, second };
      vueRouter.push({ name: PageNames.AddLiquidity, params });
    };
    const handleBridge = (asset) => {
      vueRouter.push({ name: PageNames.Bridge, params: { address: asset.address } });
    };
    return (_ctx, _cache) => {
      const _component_sora_wallet = resolveComponent("sora-wallet");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createBlock(_component_sora_wallet, {
        class: "container container--wallet",
        onClose: handleClose,
        onSwap: handleSwap,
        onLiquidity: handleLiquidity,
        onBridge: handleBridge
      }, null, 512)), [
        [_directive_loading, parentLoading.value]
      ]);
    };
  }
});
export {
  _sfc_main as default
};
