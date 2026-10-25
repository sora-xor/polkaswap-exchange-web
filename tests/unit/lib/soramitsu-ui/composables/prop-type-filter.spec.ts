import { reactive } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePropTypeFilter } from '@/lib/soramitsu-ui/composables/prop-type-filter';

describe('usePropTypeFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid prop values without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const props = reactive({
      status: 'success',
    });
    const filter = usePropTypeFilter(props);
    const status = filter('status', ['info', 'success', 'warning'], 'info');

    expect(status.value).toBe('success');
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back and logs a formatted warning for invalid values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const props = reactive({
      status: 'danger',
    });
    const filter = usePropTypeFilter(props);
    const status = filter('status', ['info', 'success', 'warning'], 'info');

    expect(status.value).toBe('info');
    expect(warn).toHaveBeenCalledWith(
      `[soramitsu-ui warn]: Invalid prop: type check failed for prop "status". Expected: 'info' | 'success' | 'warning', got 'danger'`
    );
  });

  it('normalizes legacy button type aliases before validation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const props = reactive({
      type: 'tertiary',
    });
    const filter = usePropTypeFilter(props);
    const type = filter('type', ['primary', 'secondary', 'outline', 'action'], 'primary');

    expect(type.value).toBe('secondary');
    expect(warn).not.toHaveBeenCalled();

    props.type = 'link';

    expect(type.value).toBe('secondary');
  });

  it('normalizes legacy button size aliases before validation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const props = reactive({
      size: 'large',
    });
    const filter = usePropTypeFilter(props);
    const size = filter('size', ['xs', 'sm', 'md', 'lg'], 'md');

    expect(size.value).toBe('lg');
    expect(warn).not.toHaveBeenCalled();

    props.size = 'tiny';

    expect(size.value).toBe('xs');
  });

  it('keeps canonical button type and size values unchanged', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const props = reactive({
      type: 'primary',
      size: 'md',
    });
    const filter = usePropTypeFilter(props);
    const type = filter('type', ['primary', 'secondary', 'outline', 'action'], 'secondary');
    const size = filter('size', ['xs', 'sm', 'md', 'lg'], 'lg');

    expect(type.value).toBe('primary');
    expect(size.value).toBe('md');
    expect(warn).not.toHaveBeenCalled();
  });

  it('formats non-string invalid values with JSON.stringify', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const props = reactive({
      value: { nested: true } as unknown,
    });
    const filter = usePropTypeFilter(props);
    const value = filter('value', [1, 2, 3], 1);

    expect(value.value).toBe(1);
    expect(warn).toHaveBeenCalledWith(
      '[soramitsu-ui warn]: Invalid prop: type check failed for prop "value". Expected: 1 | 2 | 3, got {"nested":true}'
    );
  });
});
