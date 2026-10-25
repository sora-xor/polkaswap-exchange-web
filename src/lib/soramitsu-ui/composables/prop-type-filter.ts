import { computed, type ComputedRef } from 'vue';

type PropName<T> = Extract<keyof T, string | number>;

const formatToLog = (value: unknown) => (typeof value === 'string' ? `'${value}'` : JSON.stringify(value));

const BUTTON_TYPE_VALUES_LEGACY = ['primary', 'secondary', 'outline', 'action'] as const;
const BUTTON_TYPE_ALIASES: Record<string, string> = {
  tertiary: 'secondary',
  link: 'secondary',
  text: 'secondary',
};

const BUTTON_SIZE_VALUES_LEGACY = ['xs', 'sm', 'md', 'lg'] as const;
const BUTTON_SIZE_ALIASES: Record<string, string> = {
  mini: 'xs',
  tiny: 'xs',
  small: 'sm',
  medium: 'md',
  big: 'lg',
  large: 'lg',
};

const asValueSet = <T>(values: readonly T[]): Set<T> => new Set(values);

function normalizeLegacyValue<T extends Record<PropertyKey, unknown>>(
  _name: PropName<T>,
  value: unknown,
  validValues: readonly unknown[]
): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const valueSet = asValueSet(validValues);

  const isButtonType = BUTTON_TYPE_VALUES_LEGACY.every((item) => valueSet.has(item));
  if (isButtonType) {
    const alias = BUTTON_TYPE_ALIASES[value];
    if (alias && valueSet.has(alias)) {
      return alias;
    }
    return value;
  }

  const isButtonSize = BUTTON_SIZE_VALUES_LEGACY.every((item) => valueSet.has(item));
  if (isButtonSize) {
    const alias = BUTTON_SIZE_ALIASES[value];
    if (alias && valueSet.has(alias)) {
      return alias;
    }
    return value;
  }

  return value;
}

export function usePropTypeFilter<T extends Record<PropertyKey, unknown>>(props: T) {
  return function <K extends PropName<T>>(
    name: K,
    validValues: readonly T[K][],
    defaultValue: T[K]
  ): ComputedRef<T[K]> {
    return computed(() => {
      const candidate = normalizeLegacyValue<T>(name, props[name], validValues) as T[K];

      if (validValues.includes(candidate)) {
        return candidate;
      }

      const formattedList = validValues.map(formatToLog).join(' | ');
      const formattedValue = formatToLog(props[name]);

      console.warn(
        `[soramitsu-ui warn]: Invalid prop: type check failed for prop "${String(
          name
        )}". Expected: ${formattedList}, got ${formattedValue}`
      );

      return defaultValue;
    });
  };
}
