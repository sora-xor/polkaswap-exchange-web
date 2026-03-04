<script setup lang="ts">
import { computed, provide, ref } from 'vue';
import { FORM_CONTEXT_KEY, type FormRule, type FormRules } from './api';

defineOptions({ name: 'SForm' });

const props = withDefaults(
  defineProps<{
    model?: Record<string, unknown>;
    rules?: FormRules;
    showMessage?: boolean;
  }>(),
  {
    model: () => ({}),
    rules: () => ({}),
    showMessage: true,
  }
);

const errors = ref<Record<string, string>>({});
const showMessageRef = computed(() => props.showMessage);

provide(FORM_CONTEXT_KEY, {
  errors,
  showMessage: showMessageRef,
});

const hasOwn = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key);

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const getValueByPath = (target: Record<string, unknown>, path: string): unknown => {
  if (!path.includes('.')) return target[path];
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    if (!hasOwn(acc, key)) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, target);
};

const clearFieldError = (prop: string): void => {
  const next = { ...errors.value };
  delete next[prop];
  errors.value = next;
};

const setFieldError = (prop: string, message: string): void => {
  errors.value = {
    ...errors.value,
    [prop]: message,
  };
};

const toError = (value: unknown, fallbackMessage: string): Error => {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : fallbackMessage);
};

const runRule = async (rule: FormRule, value: unknown): Promise<void> => {
  if (rule.required && isEmptyValue(value)) {
    throw new Error(rule.message || 'Field is required');
  }

  if (!rule.validator) return;

  await new Promise<void>((resolve, reject) => {
    let resolved = false;
    const callback = (error?: Error): void => {
      if (resolved) return;
      resolved = true;
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    try {
      const result = rule.validator!(rule, value, callback);
      if (result instanceof Promise) {
        void result.then(
          () => {
            if (resolved) return;
            resolved = true;
            resolve();
          },
          (error) => {
            if (resolved) return;
            resolved = true;
            reject(toError(error, rule.message || 'Validation failed'));
          }
        );
        return;
      }

      if (typeof result === 'boolean') {
        callback(result ? undefined : new Error(rule.message || 'Validation failed'));
        return;
      }

      if (result instanceof Error) {
        callback(result);
        return;
      }

      if (rule.validator.length < 3) {
        callback();
      }
    } catch (error) {
      callback(toError(error, rule.message || 'Validation failed'));
    }
  });
};

const validateField = async (prop: string): Promise<void> => {
  const fieldRules = props.rules?.[prop];
  if (!fieldRules?.length) {
    clearFieldError(prop);
    return;
  }

  const value = getValueByPath(props.model ?? {}, prop);

  for (const rule of fieldRules) {
    try {
      await runRule(rule, value);
      clearFieldError(prop);
    } catch (error) {
      const validationError = toError(error, rule.message || 'Validation failed');
      setFieldError(prop, validationError.message);
      throw validationError;
    }
  }
};

const validate = async (): Promise<void> => {
  const ruleEntries = Object.entries(props.rules ?? {});
  if (!ruleEntries.length) return;

  const nextErrors: Record<string, string> = {};

  for (const [prop, fieldRules] of ruleEntries) {
    const value = getValueByPath(props.model ?? {}, prop);
    for (const rule of fieldRules) {
      try {
        await runRule(rule, value);
      } catch (error) {
        const validationError = toError(error, rule.message || 'Validation failed');
        nextErrors[prop] = validationError.message;
        break;
      }
    }
  }

  errors.value = nextErrors;

  if (Object.keys(nextErrors).length) {
    throw new Error('Validation failed');
  }
};

const clearValidate = (propsToClear?: string | string[]): void => {
  if (!propsToClear) {
    errors.value = {};
    return;
  }

  const targetProps = Array.isArray(propsToClear) ? propsToClear : [propsToClear];
  const next = { ...errors.value };
  for (const prop of targetProps) {
    delete next[prop];
  }
  errors.value = next;
};

defineExpose({
  validate,
  validateField,
  clearValidate,
});
</script>

<template>
  <form class="s-form el-form" novalidate>
    <slot />
  </form>
</template>
