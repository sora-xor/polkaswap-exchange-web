import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App, ComponentPublicInstance } from 'vue';

import { createCompatWarnHandler, installCompatWarningHandler } from '@/plugins/compatWarnings';

const telemetry = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  getBuildVariant: vi.fn(() => 'vue3-native'),
}));

vi.mock('@/utils/telemetry', () => ({
  trackEvent: telemetry.trackEvent,
  getBuildVariant: telemetry.getBuildVariant,
}));

const createInstance = (name?: string) => ({ $options: { name } }) as ComponentPublicInstance;

beforeEach(() => {
  telemetry.trackEvent.mockClear();
  telemetry.getBuildVariant.mockClear();
  telemetry.getBuildVariant.mockReturnValue('vue3-native');
});

describe('createCompatWarnHandler', () => {
  it('emits telemetry for compat warnings and chains previous handler', () => {
    const previous = vi.fn();
    const handler = createCompatWarnHandler(previous, { includeTrace: true });

    const instance = createInstance('TestWidget');
    handler('@vue/compat fallback', instance, '  at <TestWidget> ');

    expect(previous).toHaveBeenCalledWith('@vue/compat fallback', instance, '  at <TestWidget> ');
    expect(telemetry.trackEvent).toHaveBeenCalledWith('compat_warning', {
      message: '@vue/compat fallback',
      component: 'TestWidget',
      buildVariant: 'vue3-native',
      trace: 'at <TestWidget>',
    });
  });

  it('skips warnings without compat markers', () => {
    const handler = createCompatWarnHandler(undefined, { includeTrace: true });

    handler('Non-compat warning', createInstance('OtherComponent'), '');

    expect(telemetry.trackEvent).not.toHaveBeenCalled();
  });

  it('omits trace payload when trace capture is disabled', () => {
    const handler = createCompatWarnHandler(undefined, { includeTrace: false });

    handler('@vue/compat fallback', createInstance('TraceLess'), 'at <TraceLess>');

    expect(telemetry.trackEvent).toHaveBeenCalledWith('compat_warning', {
      message: '@vue/compat fallback',
      component: 'TraceLess',
      buildVariant: 'vue3-native',
    });
  });
});

describe('installCompatWarningHandler', () => {
  it('wraps any existing warn handler on the app config', () => {
    const existing = vi.fn();
    const app = { config: { warnHandler: existing } } as unknown as App;

    installCompatWarningHandler(app);

    expect(app.config.warnHandler).not.toBe(existing);

    const handler = app.config.warnHandler;
    const instance = createInstance('InstallCase');
    handler?.('@vue/compat notice', instance, '');

    expect(existing).toHaveBeenCalledWith('@vue/compat notice', instance, '');
    expect(telemetry.trackEvent).toHaveBeenCalledWith(
      'compat_warning',
      expect.objectContaining({
        component: 'InstallCase',
      })
    );
  });
});
