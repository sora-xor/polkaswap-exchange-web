import { onBeforeUnmount, ref, shallowRef } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { copyToClipboard, delay } from '@/utils';

type CopyEvent = PointerEvent | MouseEvent;

/**
 * Encapsulates the copy-to-clipboard UX previously provided by
 * `CopyAddressMixin`, including tooltip messaging.
 */
export function useCopyAddress() {
  const { t } = useTranslation();
  const targetElement = shallowRef<EventTarget | null>(null);
  const wasAddressCopied = ref(false);
  let active = true;

  const removeMouseleaveListener = (target = targetElement.value): void => {
    const element = target as Nullable<HTMLElement>;
    element?.removeEventListener?.('mouseleave', handleMouseleaveListener);

    if (targetElement.value === target) {
      targetElement.value = null;
    }
  };

  const handleMouseleaveListener = async (event?: Event) => {
    const element = event?.currentTarget ?? targetElement.value;
    await delay(500);
    removeMouseleaveListener(element);

    if (!active || targetElement.value) return;

    wasAddressCopied.value = false;
  };

  const handleCopyAddress = async (address: string, event?: CopyEvent): Promise<void> => {
    removeMouseleaveListener();

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

  onBeforeUnmount(() => {
    active = false;
    removeMouseleaveListener();
  });

  return {
    handleCopyAddress,
    copyTooltip,
  };
}

export type CopyAddressComposable = ReturnType<typeof useCopyAddress>;
