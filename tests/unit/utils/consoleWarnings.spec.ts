import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('installConsoleWarningFilter', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('suppresses the polkadot metadata fallback warning while keeping other warnings', async () => {
    const forwardedWarn = vi.fn();
    const originalWarn = console.warn;

    console.warn = forwardedWarn as typeof console.warn;

    const { installConsoleWarningFilter } = await import('@/utils/consoleWarnings');
    installConsoleWarningFilter();

    console.warn(
      '2026-03-25 22:57:21        API/INIT: MetadataApi not available, rpc::state::get_metadata will be used.'
    );
    console.warn('[bootstrap] real warning');

    expect(forwardedWarn).toHaveBeenCalledTimes(1);
    expect(forwardedWarn).toHaveBeenCalledWith('[bootstrap] real warning');

    console.warn = originalWarn;
  });
});
