import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadScriptMock, unloadScriptMock } = vi.hoisted(() => ({
  loadScriptMock: vi.fn(),
  unloadScriptMock: vi.fn(),
}));

vi.mock('vue-plugin-load-script', () => ({
  loadScript: loadScriptMock,
  unloadScript: unloadScriptMock,
}));

import { ScriptLoader } from '@/lib/soraneo-wallet/src/util/scriptLoader';

describe('ScriptLoader', () => {
  beforeEach(() => {
    loadScriptMock.mockReset();
    unloadScriptMock.mockReset();
    vi.restoreAllMocks();
  });

  it('logs successful script loads and unloads in debug mode', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await ScriptLoader.load('https://cdn.example.com/a.js');
    await ScriptLoader.unload('https://cdn.example.com/a.js');

    expect(loadScriptMock).toHaveBeenCalledWith('https://cdn.example.com/a.js');
    expect(unloadScriptMock).toHaveBeenCalledWith('https://cdn.example.com/a.js');
    expect(infoSpy).toHaveBeenNthCalledWith(1, '[ScriptLoader] Script loaded: https://cdn.example.com/a.js');
    expect(infoSpy).toHaveBeenNthCalledWith(2, '[ScriptLoader] Script unloaded: https://cdn.example.com/a.js');
  });

  it('swallows loader errors in debug mode and logs them', async () => {
    const error = new Error('load failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loadScriptMock.mockRejectedValueOnce(error);
    unloadScriptMock.mockRejectedValueOnce(error);

    await expect(ScriptLoader.load('https://cdn.example.com/a.js')).resolves.toBeUndefined();
    await expect(ScriptLoader.unload('https://cdn.example.com/a.js')).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenNthCalledWith(1, error);
    expect(errorSpy).toHaveBeenNthCalledWith(2, error);
  });

  it('rethrows loader errors when debug mode is disabled', async () => {
    const loadError = new Error('load failed');
    const unloadError = new Error('unload failed');

    loadScriptMock.mockRejectedValueOnce(loadError);
    unloadScriptMock.mockRejectedValueOnce(unloadError);

    await expect(ScriptLoader.load('https://cdn.example.com/a.js', false)).rejects.toBe(loadError);
    await expect(ScriptLoader.unload('https://cdn.example.com/a.js', false)).rejects.toBe(unloadError);
  });
});
