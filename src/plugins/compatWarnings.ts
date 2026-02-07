import type { App, ComponentPublicInstance } from 'vue';

import { getBuildVariant, trackEvent } from '@/utils/telemetry';

type WarnHandler = NonNullable<App['config']['warnHandler']>;

type CompatWarnHandlerOptions = {
  includeTrace?: boolean;
};

const COMPAT_PATTERNS = [
  /@vue\/compat/i,
  /\bcompatConfig\b/i,
  /\bcompatibility build\b/i,
  /\bcompat build\b/i,
  /\bcompat mode\b/i,
];

const isCompatWarning = (message: string): boolean => {
  return COMPAT_PATTERNS.some((pattern) => pattern.test(message));
};

const resolveComponentName = (instance: ComponentPublicInstance | null): string => {
  const optionsName = (instance?.$options?.name as string | undefined) ?? '';
  const typeName = ((instance as unknown as { type?: { name?: string; __name?: string } })?.type?.name ||
    (instance as unknown as { type?: { name?: string; __name?: string } })?.type?.__name) as string | undefined;

  return optionsName || typeName || 'unknown';
};

const shouldIncludeTrace = (options: CompatWarnHandlerOptions): boolean => {
  if (typeof options.includeTrace === 'boolean') return options.includeTrace;

  const env = import.meta.env;

  if (env?.PROD === true || env?.MODE === 'production') return false;

  return true;
};

/**
 * Creates a Vue warn handler that emits telemetry for compat-related warnings while chaining any prior handler.
 */
export const createCompatWarnHandler = (
  previous?: WarnHandler,
  options: CompatWarnHandlerOptions = {}
): WarnHandler => {
  return (message: string, instance: ComponentPublicInstance | null, trace: string): void => {
    if (previous) {
      previous(message, instance, trace);
    }

    if (!isCompatWarning(message)) return;

    const payload: Record<string, unknown> = {
      message,
      component: resolveComponentName(instance),
      buildVariant: getBuildVariant(),
    };

    const trimmedTrace = trace?.trim();
    if (trimmedTrace && shouldIncludeTrace(options)) {
      payload.trace = trimmedTrace;
    }

    trackEvent('compat_warning', payload);
  };
};

/**
 * Installs the compat warning telemetry handler on the provided Vue app config.
 */
export const installCompatWarningHandler = (app: App): void => {
  const previous = app.config.warnHandler ?? undefined;
  app.config.warnHandler = createCompatWarnHandler(previous);
};
