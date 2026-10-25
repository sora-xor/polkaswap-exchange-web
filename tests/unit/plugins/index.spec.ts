import { describe, expect, it, vi } from 'vitest';

const installCountryFlagEmoji = vi.fn();
const installDayjsDuration = vi.fn();
const installSoramitsuUI = vi.fn();
const preloadLazySoramitsuComponents = vi.fn(async () => undefined);
const installWallet = vi.fn();

let echartsModuleLoaded = false;
let dayjsDurationModuleLoaded = false;
let soramitsuModuleLoaded = false;
let walletModuleLoaded = false;

vi.mock('@/plugins/countryFlagEmoji', () => ({
  installCountryFlagEmoji,
}));

vi.mock('@/plugins/days-js-duration', () => {
  dayjsDurationModuleLoaded = true;
  return {
    installDayjsDuration,
  };
});

vi.mock('@/plugins/soramitsuUI', () => ({
  install: (...args: Parameters<typeof installSoramitsuUI>) => {
    soramitsuModuleLoaded = true;
    return installSoramitsuUI(...args);
  },
  preloadLazySoramitsuComponents: (...args: Parameters<typeof preloadLazySoramitsuComponents>) =>
    preloadLazySoramitsuComponents(...args),
}));

vi.mock('@/plugins/wallet', () => ({
  install: (...args: Parameters<typeof installWallet>) => {
    walletModuleLoaded = true;
    return installWallet(...args);
  },
}));

vi.mock('@/plugins/echarts', () => {
  echartsModuleLoaded = true;
  return {
    install: vi.fn(),
  };
});

describe('plugins/index', () => {
  it('installs tiny startup plugins without eagerly loading runtime plugins', async () => {
    const { installStartupPlugins } = await import('@/plugins');

    installStartupPlugins();

    expect(installCountryFlagEmoji).toHaveBeenCalledTimes(1);
    expect(installDayjsDuration).not.toHaveBeenCalled();
    expect(dayjsDurationModuleLoaded).toBe(false);
    expect(soramitsuModuleLoaded).toBe(false);
    expect(walletModuleLoaded).toBe(false);
    expect(echartsModuleLoaded).toBe(false);
  });

  it('loads runtime plugins asynchronously', async () => {
    const app = {} as any;
    const context = { pinia: { id: 'pinia' } };
    const { installRuntimePlugins } = await import('@/plugins');

    await installRuntimePlugins(app, context);

    expect(installDayjsDuration).toHaveBeenCalledTimes(1);
    expect(installSoramitsuUI).toHaveBeenCalledWith(app);
    expect(installWallet).toHaveBeenCalledWith(app, context);
    expect(echartsModuleLoaded).toBe(false);
  });

  it('resolves the lazily registered UI components after installing them', async () => {
    const app = {} as any;
    const { installRuntimePlugins } = await import('@/plugins');
    installSoramitsuUI.mockClear();
    preloadLazySoramitsuComponents.mockClear();

    let resolvePreload!: () => void;
    preloadLazySoramitsuComponents.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          resolvePreload = () => resolve(undefined);
        })
    );

    let settled = false;
    const pending = installRuntimePlugins(app).then(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(preloadLazySoramitsuComponents).toHaveBeenCalledWith(app));

    expect(installSoramitsuUI.mock.invocationCallOrder[0]).toBeLessThan(
      preloadLazySoramitsuComponents.mock.invocationCallOrder[0]
    );
    expect(settled).toBe(false);

    resolvePreload();
    await pending;
    expect(settled).toBe(true);
  });

  it('keeps the default installer compatible', async () => {
    const app = {} as any;
    const context = { pinia: { id: 'pinia' } };
    const installPlugins = (await import('@/plugins')).default;

    await installPlugins(app, context);

    expect(installDayjsDuration).toHaveBeenCalled();
    expect(installCountryFlagEmoji).toHaveBeenCalled();
    expect(installSoramitsuUI).toHaveBeenCalledWith(app);
    expect(installWallet).toHaveBeenCalledWith(app, context);
  });
});
