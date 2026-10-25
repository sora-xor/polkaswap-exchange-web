import { nextTick, onActivated, onMounted, ref, type Ref } from 'vue';

type FocusTarget = {
  focus?: () => void;
} | null;

type AutofocusSource = boolean | Ref<boolean> | (() => boolean);

const resolveAutofocus = (value: AutofocusSource): boolean => {
  if (typeof value === 'function') {
    return Boolean(value());
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return Boolean(value.value);
};

export function useInputFocus(autofocus: AutofocusSource = false) {
  const input = ref<FocusTarget>(null);

  const focus = (): void => {
    input.value?.focus?.();
  };

  const focusCheck = async (): Promise<void> => {
    if (!resolveAutofocus(autofocus)) return;

    await nextTick();
    focus();
  };

  onMounted(() => {
    void focusCheck();
  });

  onActivated(() => {
    void focusCheck();
  });

  return {
    input,
    focus,
    focusCheck,
  };
}
