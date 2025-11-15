import { ref, watch } from 'vue';

import type { Ref } from 'vue';

type EmitFn = (value: boolean) => void;

type UseDialogOptions = {
  emit?: EmitFn;
  onClose?: () => void;
};

export interface UseDialogResult {
  isVisible: Ref<boolean>;
  setVisible: (value: boolean) => void;
  closeDialog: () => void;
}

export function useDialogVisibility(propVisible: Ref<boolean>, options: UseDialogOptions = {}): UseDialogResult {
  const { emit, onClose } = options;
  const isVisible = ref(propVisible.value);

  watch(
    propVisible,
    (value) => {
      if (isVisible.value !== value) {
        isVisible.value = value;
      }
    },
    { immediate: true }
  );

  watch(isVisible, (value, oldValue) => {
    if (value === oldValue) return;
    emit?.(value);
  });

  const setVisible = (value: boolean) => {
    isVisible.value = value;
  };

  const closeDialog = () => {
    onClose?.();
    setVisible(false);
  };

  return {
    isVisible,
    setVisible,
    closeDialog,
  };
}
