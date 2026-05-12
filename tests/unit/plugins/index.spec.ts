import { describe, expect, it, vi } from 'vitest';

const installCountryFlagEmoji = vi.fn();
const installDayjsDuration = vi.fn();
const installSoramitsuUI = vi.fn();
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
