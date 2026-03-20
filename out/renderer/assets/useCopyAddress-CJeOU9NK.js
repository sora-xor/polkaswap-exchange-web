import { u as useTranslation, a9 as ref, aD as copyToClipboard, aE as delay } from "./index-73GArslZ.js";
function useCopyAddress() {
  const { t } = useTranslation();
  const targetElement = ref(null);
  const wasAddressCopied = ref(false);
  const handleMouseleaveListener = async () => {
    await delay(500);
    wasAddressCopied.value = false;
    const element = targetElement.value;
    if (element) {
      element.removeEventListener("mouseleave", handleMouseleaveListener);
    }
    targetElement.value = null;
  };
  const handleCopyAddress = async (address, event) => {
    if (event) {
      event.stopImmediatePropagation?.();
      const element = event.target;
      if (element) {
        targetElement.value = element;
        element.addEventListener("mouseleave", handleMouseleaveListener);
      }
    }
    await copyToClipboard(address);
    wasAddressCopied.value = true;
    await delay(1e3);
  };
  const copyTooltip = (tooltipCopyValue) => {
    if (!wasAddressCopied.value) {
      return tooltipCopyValue ? t("copyWithValue", { value: tooltipCopyValue }) : t("assets.receive");
    }
    return tooltipCopyValue ? t("copiedWithValue", { value: tooltipCopyValue }) : t("assets.copied");
  };
  return {
    handleCopyAddress,
    copyTooltip
  };
}
export {
  useCopyAddress as u
};
