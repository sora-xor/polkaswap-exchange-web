import { describe, expect, it, vi } from 'vitest';

import { installVueErrorHandler, isInvalidDynamicTagError } from '@/utils/vueErrorHandler';

describe('utils/vueErrorHandler', () => {
  it('detects invalid dynamic tag DOM exceptions', () => {
    expect(
      isInvalidDynamicTagError({
        name: 'InvalidCharacterError',
        message: "Failed to execute 'createElement' on 'Document': The tag name provided ('0.5') is not a valid name.",
      })
    ).toBe(true);

    expect(isInvalidDynamicTagError({ name: 'InvalidCharacterError', message: 'something else' })).toBe(false);
    expect(isInvalidDynamicTagError({ name: 'OtherError', message: '...' })).toBe(false);
    expect(isInvalidDynamicTagError(null)).toBe(false);
  });

  it('does not throw when error fields are implemented as throwing getters', () => {
    const brokenError = {};
    Object.defineProperty(brokenError, 'name', {
      get: () => 'ReferenceError',
    });
    Object.defineProperty(brokenError, 'message', {
      get: () => {
        throw new ReferenceError("Cannot access 'default' before initialization.");
      },
    });

    expect(() => isInvalidDynamicTagError(brokenError)).not.toThrow();
    expect(isInvalidDynamicTagError(brokenError)).toBe(false);
  });

  it('downgrades invalid tag render errors to warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const previousHandler = vi.fn();

    const app = { config: { errorHandler: previousHandler } } as any;

    installVueErrorHandler(app);

    app.config.errorHandler(
      {
        name: 'InvalidCharacterError',
        message: "Failed to execute 'createElement' on 'Document': The tag name provided ('0.5') is not a valid name.",
      },
      { type: { name: 'FakeComponent' } } as any,
      'render function'
    );

    expect(previousHandler).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('delegates unknown errors to existing handler', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const previousHandler = vi.fn();

    const app = { config: { errorHandler: previousHandler } } as any;
    installVueErrorHandler(app);

    const err = new Error('boom');
    app.config.errorHandler(err, null, 'mounted');

    expect(previousHandler).toHaveBeenCalledWith(err, null, 'mounted');
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('suppresses transient async default-initialization reference errors', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const previousHandler = vi.fn();

    const app = { config: { errorHandler: previousHandler } } as any;
    installVueErrorHandler(app);

    app.config.errorHandler(new ReferenceError("Cannot access 'default' before initialization."), null, 'setup');

    expect(previousHandler).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[vue] suppressed transient async component initialization error');

    warnSpy.mockRestore();
  });

  it('falls back to safe logging when console cannot print raw error objects', () => {
    const brokenError = {};
    Object.defineProperty(brokenError, 'name', {
      get: () => 'ReferenceError',
    });
    Object.defineProperty(brokenError, 'message', {
      get: () => {
        throw new ReferenceError("Cannot access 'default' before initialization.");
      },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const originalConsoleError = console.error;
    const consoleErrorMock = vi.fn((value: unknown) => {
      if (value === brokenError) {
        throw new Error('Cannot print raw error');
      }
    });
    console.error = consoleErrorMock as unknown as typeof console.error;

    const app = { config: { errorHandler: undefined } } as any;
    installVueErrorHandler(app);

    expect(() => app.config.errorHandler?.(brokenError, null, 'mounted')).not.toThrow();
    expect(consoleErrorMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorMock.mock.calls[1]?.[0]).toContain('failed to log raw error object');

    console.error = originalConsoleError;
    warnSpy.mockRestore();
  });
});
