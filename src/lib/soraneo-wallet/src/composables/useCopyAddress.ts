import { onBeforeUnmount, ref, shallowRef } from 'vue';

import { copyToClipboard, delay } from '@/util';

import { useTranslation } from './useTranslation';

type CopyEvent = PointerEvent | MouseEvent | undefined;

export function useCopyAddress() {
  const { t } = useTranslation();

  const targetElement = shallowRef<EventTarget | null>(null);
  const wasAddressCopied = ref(false);
  let active = true;

  const removeMouseleaveListener = (target = targetElement.value): void => {
    if (target instanceof HTMLElement) {
      target.removeEventListener('mouseleave', handleMouseleaveListener);
    }

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

  const handleCopyAddress = async (address: string, event?: CopyEvent) => {
    removeMouseleaveListener();

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
    active = false;
    removeMouseleaveListener();
  });

  return {
    wasAddressCopied,
    handleCopyAddress,
    copyTooltip,
  };
}
