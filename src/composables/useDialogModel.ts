import { computed } from 'vue';

/**
 * Provides a writable computed bridge for `v-model:visible` dialogs while
 * keeping the emitted contract compatible with existing `.sync` usage.
 */
export function useDialogModel(
  props: { visible: boolean },
  emit: (event: 'update:visible' | 'close', value?: boolean) => void
) {
  const isVisible = computed({
    get: () => props.visible,
    set: (value: boolean) => emit('update:visible', value),
  });

  const closeDialog = () => {
    emit('close');
    isVisible.value = false;
  };

  return { isVisible, closeDialog };
}

export type DialogModel = ReturnType<typeof useDialogModel>;
