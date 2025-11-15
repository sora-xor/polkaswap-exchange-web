import { nextTick, ref, watch, type Ref } from 'vue';

interface PassiveModelOptions {
  deep?: boolean;
}

export function usePassiveModel<T>(model: Ref<T>, options: PassiveModelOptions = {}): Ref<T> {
  const { deep = false } = options;
  const proxy = ref(model.value) as Ref<T>;
  let isUpdating = false;

  watch(
    model,
    (value) => {
      if (isUpdating) return;
      isUpdating = true;
      proxy.value = value;
      nextTick(() => {
        isUpdating = false;
      });
    },
    { deep }
  );

  watch(
    proxy,
    (value) => {
      if (isUpdating) return;
      if (deep || !Object.is(value, model.value)) {
        model.value = value;
      }
    },
    { deep }
  );

  return proxy;
}
