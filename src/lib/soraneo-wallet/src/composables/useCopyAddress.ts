import { onBeforeUnmount, ref } from 'vue';

import { copyToClipboard, delay } from '@/util';

import { useTranslation } from './useTranslation';

type CopyEvent = PointerEvent | MouseEvent | undefined;

export function useCopyAddress() {
  const { t } = useTranslation();

  const targetElement = ref<EventTarget | null>(null);
  const wasAddressCopied = ref(false);

  const handleMouseleaveListener = async () => {
    await delay(500);
    wasAddressCopied.value = false;

    const element = targetElement.value;
    if (element instanceof HTMLElement) {
      element.removeEventListener('mouseleave', handleMouseleaveListener);
    }

    targetElement.value = null;
  };

  const handleCopyAddress = async (address: string, event?: CopyEvent) => {
    if (event) {
      event.stopImmediatePropagation();
      const element = event.target as EventTarget | null;
      if (element instanceof HTMLElement) {
        element.addEventListener('mouseleave', handleMouseleaveListener);
        targetElement.value = element;
      }
    }

    await copyToClipboard(address);
    wasAddressCopied.value = true;
    await delay(1000);
  };

  const copyTooltip = (tooltipCopyValue?: string) => {
    if (!wasAddressCopied.value) {
      return tooltipCopyValue ? t('copyWithValue', { value: tooltipCopyValue }) : t('assets.receive');
    }

    return tooltipCopyValue ? t('copiedWithValue', { value: tooltipCopyValue }) : t('assets.copied');
  };

  onBeforeUnmount(() => {
    const element = targetElement.value;
    if (element instanceof HTMLElement) {
      element.removeEventListener('mouseleave', handleMouseleaveListener);
    }
  });

  return {
    wasAddressCopied,
    handleCopyAddress,
    copyTooltip,
  };
}
