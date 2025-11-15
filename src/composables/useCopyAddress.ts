import { ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { copyToClipboard, delay } from '@/utils';

type CopyEvent = PointerEvent | MouseEvent;

/**
 * Encapsulates the copy-to-clipboard UX previously provided by
 * `CopyAddressMixin`, including tooltip messaging.
 */
export function useCopyAddress() {
  const { t } = useTranslation();
  const targetElement = ref<EventTarget | null>(null);
  const wasAddressCopied = ref(false);

  const handleMouseleaveListener = async () => {
    await delay(500);
    wasAddressCopied.value = false;

    const element = targetElement.value as HTMLElement | null;

    if (element) {
      element.removeEventListener('mouseleave', handleMouseleaveListener);
    }

    targetElement.value = null;
  };

  const handleCopyAddress = async (address: string, event?: CopyEvent): Promise<void> => {
    if (event) {
      event.stopImmediatePropagation?.();
      const element = event.target as HTMLElement | null;

      if (element) {
        targetElement.value = element;
        element.addEventListener('mouseleave', handleMouseleaveListener);
      }
    }

    await copyToClipboard(address);
    wasAddressCopied.value = true;
    await delay(1000);
  };

  const copyTooltip = (tooltipCopyValue?: string): string => {
    if (!wasAddressCopied.value) {
      return tooltipCopyValue ? t('copyWithValue', { value: tooltipCopyValue }) : t('assets.receive');
    }

    return tooltipCopyValue ? t('copiedWithValue', { value: tooltipCopyValue }) : t('assets.copied');
  };

  return {
    handleCopyAddress,
    copyTooltip,
  };
}

export type CopyAddressComposable = ReturnType<typeof useCopyAddress>;
