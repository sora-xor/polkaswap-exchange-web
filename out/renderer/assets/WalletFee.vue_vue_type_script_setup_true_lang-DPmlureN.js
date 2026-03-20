import { cI as MaxTotalSupply, F as FPNumber, aL as getWalletStore, X as XOR, w as BalanceType, c5 as FontWeightRate, c7 as FontSizeRate, h as computed, z as defineComponent, u as useTranslation, A as createElementBlock, C as openBlock, ap as createVNode, aj as unref } from "./index-73GArslZ.js";
import InfoLine from "./InfoLine-CzKcagSJ.js";
function useNumberFormatter() {
  const Zero = FPNumber.ZERO;
  const Hundred = FPNumber.HUNDRED;
  const MaxInputNumber = MaxTotalSupply;
  const getFPNumber = (value, decimals) => {
    return new FPNumber(value, decimals);
  };
  const getFPNumberFromCodec = (value, decimals) => {
    return FPNumber.fromCodecValue(value, decimals);
  };
  const formatCodecNumber = (value, decimals) => {
    return getFPNumberFromCodec(value, decimals).toLocaleString();
  };
  const formatStringValue = (value, decimals) => {
    return getFPNumber(value, decimals).toLocaleString();
  };
  const getStringFromCodec = (value, decimals) => {
    return FPNumber.fromCodecValue(value, decimals).toString();
  };
  const isCodecZero = (value, decimals) => {
    return getFPNumberFromCodec(value, decimals).isZero();
  };
  const getCorrectSupply = (tokenSupply, decimals) => {
    const fpnTokenSupply = getFPNumber(tokenSupply, decimals);
    const fpnMaxTokenSupply = getFPNumber(MaxTotalSupply, decimals);
    if (FPNumber.gt(fpnTokenSupply, fpnMaxTokenSupply)) {
      return fpnMaxTokenSupply.toString();
    }
    return fpnTokenSupply.toString();
  };
  return {
    Zero,
    Hundred,
    MaxInputNumber,
    getFPNumber,
    getFPNumberFromCodec,
    formatCodecNumber,
    formatStringValue,
    getStringFromCodec,
    isCodecZero,
    getCorrectSupply
  };
}
function useFormattedAmount() {
  const store = getWalletStore();
  const { getFPNumber, getFPNumberFromCodec } = useNumberFormatter();
  const fiatPriceObject = computed(() => store.state.wallet.account.fiatPriceObject);
  const getAssetFiatPrice = (asset) => {
    return fiatPriceObject.value?.[asset.address] ?? null;
  };
  const getFiatBalance = (asset, type = BalanceType.Transferable) => {
    if (!asset) return null;
    const price = getAssetFiatPrice(asset);
    if (!price || !asset.balance) {
      return null;
    }
    return getFPNumberFromCodec(asset.balance[type], asset.decimals).mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };
  const getFiatAmount = (amount, asset, isCodecString = false) => {
    if (!amount && amount !== "") {
      return null;
    }
    const price = getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    const { decimals } = asset;
    const amountParam = amount || "0";
    return (isCodecString ? getFPNumberFromCodec(amountParam, decimals) : getFPNumber(amountParam, decimals)).mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };
  const getFiatAmountByString = (amount, asset) => {
    if (!amount && amount !== "") {
      return null;
    }
    const price = getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    return getFPNumber(amount || "0", asset.decimals).mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };
  const getFPNumberFiatAmountByFPNumber = (amount, asset = XOR) => {
    const price = getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    return amount.mul(FPNumber.fromCodecValue(price));
  };
  const getFiatAmountByFPNumber = (amount, asset = XOR) => {
    const price = getAssetFiatPrice(asset);
    if (!price) {
      return null;
    }
    return amount.mul(FPNumber.fromCodecValue(price)).toLocaleString();
  };
  const getFiatAmountByCodecString = (amount, asset = XOR) => {
    return getFiatAmount(amount, asset, true);
  };
  return {
    FontSizeRate,
    FontWeightRate,
    getAssetFiatPrice,
    getFiatBalance,
    getFiatAmount,
    getFiatAmountByString,
    getFPNumberFiatAmountByFPNumber,
    getFiatAmountByFPNumber,
    getFiatAmountByCodecString
  };
}
const _hoisted_1 = { class: "info-line-container" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "WalletFee",
  props: {
    value: {}
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const { getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
    const xor = XOR.symbol;
    const formatValue = (value) => {
      return value.isFinity() ? value.toLocaleString() : value.toString();
    };
    const formattedValue = computed(() => formatValue(props.value));
    const formattedFiatValue = computed(() => {
      const value = getFPNumberFiatAmountByFPNumber(props.value);
      if (!value) return value;
      return formatValue(value);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(InfoLine, {
          class: "wallet-fee",
          "is-formatted": "",
          label: unref(t)("networkFeeText"),
          "label-tooltip": unref(t)("networkFeeTooltipText"),
          value: formattedValue.value,
          "asset-symbol": unref(xor),
          "fiat-value": formattedFiatValue.value
        }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
      ]);
    };
  }
});
export {
  _sfc_main as _
};
