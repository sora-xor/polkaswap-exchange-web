import { describe, expect, it, vi } from 'vitest';

const installCountryFlagEmoji = vi.fn();
const installDayjsDuration = vi.fn();
const installSoramitsuUI = vi.fn();
const installWallet = vi.fn();

let echartsModuleLoaded = false;

vi.mock('@/plugins/countryFlagEmoji', () => ({
  installCountryFlagEmoji,
}));

vi.mock('@/plugins/days-js-duration', () => ({
  installDayjsDuration,
}));

vi.mock('@/plugins/soramitsuUI', () => ({
  install: installSoramitsuUI,
}));

vi.mock('@/plugins/wallet', () => ({
  install: installWallet,
}));

vi.mock('@/plugins/echarts', () => {
  echartsModuleLoaded = true;
  return {
    install: vi.fn(),
  };
});

describe('plugins/index', () => {
  it('installs shared startup plugins without eagerly loading the chart plugin', async () => {
    const app = {} as any;
    const context = { pinia: { id: 'pinia' } };
    const installPlugins = (await import('@/plugins')).default;

    await installPlugins(app, context);

    expect(installDayjsDuration).toHaveBeenCalledTimes(1);
    expect(installCountryFlagEmoji).toHaveBeenCalledTimes(1);
    expect(installSoramitsuUI).toHaveBeenCalledWith(app);
    expect(installWallet).toHaveBeenCalledWith(app, context);
    expect(echartsModuleLoaded).toBe(false);
  });
});
