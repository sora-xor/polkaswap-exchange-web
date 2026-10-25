import type { App as VueApp, ComponentPublicInstance } from 'vue';

type VueErrorHandler = NonNullable<VueApp['config']['errorHandler']>;

const getObjectProperty = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== 'object') return undefined;

  try {
    return (value as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
};

const getErrorName = (error: unknown): string | undefined => {
  const name = getObjectProperty(error, 'name');
  return typeof name === 'string' ? name : undefined;
};

const getErrorMessage = (error: unknown): string | undefined => {
  const message = getObjectProperty(error, 'message');
  return typeof message === 'string' ? message : undefined;
};

const isTransientAsyncDefaultInitError = (error: unknown): boolean => {
  if (getErrorName(error) !== 'ReferenceError') return false;
  const message = getErrorMessage(error);
  return typeof message === 'string' && message.includes("Cannot access 'default' before initialization");
};

const logUnexpectedError = (error: unknown): void => {
  try {
    console.error(error);
    return;
  } catch {
    // Ignore and use a string fallback below.
  }

  const name = getErrorName(error) ?? 'Error';
  const message = getErrorMessage(error) ?? String(error);
  try {
    console.error(`[vue] failed to log raw error object: ${name}: ${message}`);
  } catch {
    // Ignore logging failures to avoid recursive exceptions.
  }
};

/**
 * Vue's renderer can throw an `InvalidCharacterError` if something passes an invalid string
 * into a dynamic vnode type (for example `<component :is="...">`).
 *
 * The app should never surface this as a console error during bootstrap because it breaks
 * IPFS smoke checks and degrades the "static shell" UX.
 */
export const isInvalidDynamicTagError = (error: unknown): boolean => {
  const name = getErrorName(error);
  if (name !== 'InvalidCharacterError') return false;

  const message = getErrorMessage(error);
  if (typeof message !== 'string') return false;

  // Chrome/Chromium DOMException message format:
  // "Failed to execute 'createElement' on 'Document': The tag name provided ('0.5') is not a valid name."
  return message.includes('createElement') && message.includes('tag name') && message.includes('not a valid name');
};

/**
 * Installs an app-level Vue error handler that:
 * - suppresses known non-actionable render-time tag errors (downgrades to warning)
 * - delegates everything else to any previously configured handler
 */
export const installVueErrorHandler = (app: VueApp): void => {
  const previous = app.config.errorHandler as VueErrorHandler | undefined;

  app.config.errorHandler = (error: unknown, instance: ComponentPublicInstance | null, info: string) => {
    if (isInvalidDynamicTagError(error)) {
      const componentName = (instance as any)?.type?.name as string | undefined;
      const message = getErrorMessage(error);
      const tagMatch = typeof message === 'string' ? message.match(/tag name provided \\(\\'([^']+)\\'\\)/i) : null;
      const tag = tagMatch?.[1];
      const trace: string[] = [];
      // ComponentPublicInstance exposes the internal instance via `$` which keeps parent links.
      let cursor = (instance as any)?.$ as any;
      while (cursor) {
        const name = cursor.type?.name || cursor.type?.__file || 'Anonymous';
        trace.push(String(name));
        cursor = cursor.parent;
      }
      const traceSummary = trace.length ? trace.join(' > ') : 'unknown';
      console.warn(
        `[vue] suppressed InvalidCharacterError during render info=${info} tag=${tag ?? 'unknown'} trace=${traceSummary}`
      );
      return;
    }

    if (isTransientAsyncDefaultInitError(error)) {
      console.warn('[vue] suppressed transient async component initialization error');
      return;
    }

    if (previous) {
      previous(error, instance, info);
      return;
    }

    // Keep the default behaviour for unexpected errors.
    logUnexpectedError(error);
  };
};
