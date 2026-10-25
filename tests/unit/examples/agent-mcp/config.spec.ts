// @vitest-environment node

import { describe, expect, it } from 'vitest';
import path from 'node:path';

import {
  McpBridgeConfigError,
  isLiteralLoopbackHostname,
  isLoopbackHostname,
  normalizeAppUrl,
  normalizeCdpUrl,
  normalizeProfileDir,
  parseBridgeConfig,
} from '../../../../examples/agent-mcp/config.mjs';

const PROFILE_DIR = path.join(process.cwd(), '.polkaswap-mcp-test-profile');

type FakeEntry = { realPath?: string; type: 'directory' | 'file' | 'symlink' };

function fakeFileSystem(entries: Record<string, FakeEntry>) {
  const records = new Map(Object.entries(entries).map(([name, entry]) => [path.normalize(name), entry]));
  const missing = () => Object.assign(new Error('missing'), { code: 'ENOENT' });
  const entryFor = (name: string) => records.get(path.normalize(name));
  const statFor = (entry: FakeEntry) => ({
    isDirectory: () => entry.type === 'directory',
    isSymbolicLink: () => entry.type === 'symlink',
  });

  return {
    lstatSync(name: string) {
      const entry = entryFor(name);
      if (!entry) throw missing();
      return statFor(entry);
    },
    realpathSync(name: string) {
      const entry = entryFor(name);
      if (!entry) throw missing();
      return entry.realPath ?? path.normalize(name);
    },
    statSync(name: string) {
      const entry = entryFor(name);
      if (!entry) throw missing();
      return statFor(entry);
    },
  };
}

describe('Polkaswap MCP bridge configuration', () => {
  it('accepts an explicit persistent profile and applies conservative defaults', () => {
    const config = parseBridgeConfig({ argv: ['--profile-dir', PROFILE_DIR], env: {} });

    expect(config).toEqual({
      appUrl: 'https://polkaswap.io/?polkaswap-agent=1#/swap',
      allowCustomOrigin: false,
      cdpUrl: null,
      headless: false,
      mode: 'persistent',
      navigationTimeoutMs: 60_000,
      profileDir: PROFILE_DIR,
      readyTimeoutMs: 30_000,
      toolTimeoutMs: 120_000,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('lets CLI values override environment values', () => {
    const config = parseBridgeConfig({
      argv: [
        '--profile-dir',
        PROFILE_DIR,
        '--app-url=http://127.0.0.1:4173/#/swap',
        '--headed',
        '--tool-timeout-ms',
        '2000',
      ],
      env: {
        POLKASWAP_MCP_APP_URL: 'https://ignored.example/',
        POLKASWAP_MCP_HEADLESS: 'true',
        POLKASWAP_MCP_TOOL_TIMEOUT_MS: '3000',
      },
    });

    expect(config.appUrl).toBe('http://127.0.0.1:4173/?polkaswap-agent=1#/swap');
    expect(config.headless).toBe(false);
    expect(config.toolTimeoutMs).toBe(2000);
  });

  it('accepts only literal loopback hosts for local HTTP', () => {
    expect(isLoopbackHostname('localhost')).toBe(true);
    expect(isLoopbackHostname('127.0.0.42')).toBe(true);
    expect(isLoopbackHostname('[::1]')).toBe(true);
    expect(isLoopbackHostname('local.example')).toBe(false);
    expect(isLoopbackHostname('128.0.0.1')).toBe(false);
    expect(isLiteralLoopbackHostname('localhost')).toBe(false);
    expect(isLiteralLoopbackHostname('127.0.0.42')).toBe(true);
    expect(isLiteralLoopbackHostname('[::1]')).toBe(true);

    expect(normalizeAppUrl('http://127.0.0.42:4173/swap')).toBe('http://127.0.0.42:4173/swap?polkaswap-agent=1');
    expect(() => normalizeAppUrl('http://localhost:4173/swap')).toThrow(McpBridgeConfigError);
    expect(() => normalizeAppUrl('http://polkaswap.io/')).toThrow(McpBridgeConfigError);
    expect(() => normalizeAppUrl('ftp://127.0.0.1/app')).toThrow(McpBridgeConfigError);
    expect(() => normalizeAppUrl('https://user:secret@example.com/')).toThrow(/must not contain credentials/);
  });

  it('requires an explicit opt-in for non-Polkaswap HTTPS origins', () => {
    expect(() => normalizeAppUrl('https://staging.example/#/swap')).toThrow(/allow-custom-origin/);
    expect(normalizeAppUrl('https://staging.example/#/swap', { allowCustomOrigin: true })).toBe(
      'https://staging.example/?polkaswap-agent=1#/swap'
    );
    expect(() => normalizeAppUrl('http://staging.example/#/swap', { allowCustomOrigin: true })).toThrow(
      McpBridgeConfigError
    );

    const fromCli = parseBridgeConfig({
      argv: ['--profile-dir', PROFILE_DIR, '--app-url', 'https://staging.example/#/swap', '--allow-custom-origin'],
      env: {},
    });
    expect(fromCli.allowCustomOrigin).toBe(true);
    expect(fromCli.appUrl).toBe('https://staging.example/?polkaswap-agent=1#/swap');

    const fromEnvironment = parseBridgeConfig({
      argv: ['--profile-dir', PROFILE_DIR],
      env: {
        POLKASWAP_MCP_ALLOW_CUSTOM_ORIGIN: 'true',
        POLKASWAP_MCP_APP_URL: 'https://preview.example/#/swap',
      },
    });
    expect(fromEnvironment.allowCustomOrigin).toBe(true);
    expect(fromEnvironment.appUrl).toBe('https://preview.example/?polkaswap-agent=1#/swap');
  });

  it('accepts only loopback HTTP or WebSocket CDP endpoints', () => {
    expect(normalizeCdpUrl('http://127.0.0.1:9222')).toBe('http://127.0.0.1:9222/');
    expect(normalizeCdpUrl('ws://[::1]:9222/devtools/browser/id')).toBe('ws://[::1]:9222/devtools/browser/id');

    for (const value of [
      'http://192.168.1.2:9222',
      'https://127.0.0.1:9222',
      'wss://localhost:9222',
      'http://user:secret@127.0.0.1:9222',
    ]) {
      expect(() => normalizeCdpUrl(value)).toThrow(McpBridgeConfigError);
    }
  });

  it('uses CDP mode without taking ownership of a profile', () => {
    const config = parseBridgeConfig({
      argv: ['--cdp-url', 'http://localhost:9222'],
      env: {},
    });

    expect(config.mode).toBe('cdp');
    expect(config.profileDir).toBeNull();
    expect(config.cdpUrl).toBe('http://localhost:9222/');
  });

  it('rejects ambiguous or unsafe profile configuration', () => {
    expect(() => parseBridgeConfig({ argv: [], env: {} })).toThrow(/requires an explicit absolute/);
    expect(() => parseBridgeConfig({ argv: ['--profile-dir', 'relative/profile'], env: {} })).toThrow(
      /explicit and absolute/
    );
    expect(() => parseBridgeConfig({ argv: ['--profile-dir', '/'], env: {} })).toThrow(/filesystem root/);
    expect(() =>
      parseBridgeConfig({
        argv: ['--profile-dir', PROFILE_DIR, '--cdp-url', 'http://127.0.0.1:9222'],
        env: {},
      })
    ).toThrow(/either --cdp-url or --profile-dir/);
  });

  it('validates effective profile paths without creating files', () => {
    const homeDir = '/home/operator';
    const browserRoot = '/home/operator/Library/Application Support/Google/Chrome';
    const fileSystem = fakeFileSystem({
      '/': { type: 'directory' },
      [homeDir]: { type: 'directory' },
      [browserRoot]: { type: 'directory' },
      '/home/operator/not-a-directory': { type: 'file' },
      '/home/operator/profile-link': { type: 'symlink', realPath: browserRoot },
    });
    const options = { environment: {}, fileSystem, homeDir, platform: 'darwin' };

    expect(normalizeProfileDir('/home/operator/polkaswap-mcp', options)).toBe('/home/operator/polkaswap-mcp');
    expect(() => normalizeProfileDir(homeDir, options)).toThrow(/home directory/);
    expect(() => normalizeProfileDir('/home/operator/not-a-directory', options)).toThrow(/not a directory/);
    expect(() => normalizeProfileDir(`${browserRoot}/Default`, options)).toThrow(/live\/default browser profile/);
    expect(() => normalizeProfileDir('/home/operator/profile-link/Default', options)).toThrow(
      /live\/default browser profile/
    );
    expect(() =>
      normalizeProfileDir('/HOME/OPERATOR/LIBRARY/APPLICATION SUPPORT/GOOGLE/CHROME/DEFAULT', options)
    ).toThrow(/live\/default browser profile/);
  });

  it('rejects Chrome Dev and Chrome for Testing default roots on macOS and Windows', () => {
    const homeDir = '/home/operator';
    const fileSystem = fakeFileSystem({
      '/': { type: 'directory' },
      [homeDir]: { type: 'directory' },
    });
    const macOptions = { environment: {}, fileSystem, homeDir, platform: 'darwin' };

    for (const profileName of ['Chrome Dev', 'Chrome for Testing']) {
      expect(() =>
        normalizeProfileDir(`/home/operator/Library/Application Support/Google/${profileName}/Default`, macOptions)
      ).toThrow(/live\/default browser profile/);
    }

    const localAppData = '/home/operator/AppData/Local';
    const windowsOptions = {
      environment: { LOCALAPPDATA: localAppData },
      fileSystem,
      homeDir,
      platform: 'win32',
    };
    for (const profileName of ['Chrome Dev', 'Chrome for Testing']) {
      expect(() =>
        normalizeProfileDir(`${localAppData}/Google/${profileName}/User Data/Default`, windowsOptions)
      ).toThrow(/live\/default browser profile/);
    }
  });

  it('rejects Linux browser roots relocated by supported environment variables', () => {
    const homeDir = '/home/operator';
    const xdgConfigHome = '/browser-config/xdg';
    const chromeConfigHome = '/browser-config/chrome';
    const directUserData = '/browser-config/direct-user-data';
    const fileSystem = fakeFileSystem({
      '/': { type: 'directory' },
      [homeDir]: { type: 'directory' },
    });
    const options = {
      environment: {
        CHROME_CONFIG_HOME: chromeConfigHome,
        CHROME_USER_DATA_DIR: directUserData,
        XDG_CONFIG_HOME: xdgConfigHome,
      },
      fileSystem,
      homeDir,
      platform: 'linux',
    };

    for (const candidate of [
      '/home/operator/.config/google-chrome-for-testing/Default',
      '/home/operator/.config/google-chrome-unstable/Default',
      `${xdgConfigHome}/google-chrome-for-testing/Default`,
      `${xdgConfigHome}/google-chrome-unstable/Default`,
      `${chromeConfigHome}/google-chrome-for-testing/Default`,
      `${chromeConfigHome}/google-chrome-unstable/Default`,
      `${directUserData}/Default`,
    ]) {
      expect(() => normalizeProfileDir(candidate, options)).toThrow(/live\/default browser profile/);
    }

    expect(normalizeProfileDir('/home/operator/polkaswap-mcp-linux', options)).toBe(
      '/home/operator/polkaswap-mcp-linux'
    );
  });

  it('rejects malformed flags, booleans, and out-of-range timeouts', () => {
    expect(() => parseBridgeConfig({ argv: ['--profile-dir', PROFILE_DIR, '--unknown'], env: {} })).toThrow(
      /Unknown option/
    );
    expect(() => parseBridgeConfig({ argv: ['--profile-dir', PROFILE_DIR, '--app-url'], env: {} })).toThrow(
      /Missing value/
    );
    expect(() =>
      parseBridgeConfig({
        argv: ['--profile-dir', PROFILE_DIR, '--profile-dir', '/tmp/other'],
        env: {},
      })
    ).toThrow(/Duplicate option/);
    expect(() =>
      parseBridgeConfig({ argv: ['--profile-dir', PROFILE_DIR, '--headed', '--headless'], env: {} })
    ).toThrow(/Specify only one/);
    expect(() =>
      parseBridgeConfig({
        argv: ['--profile-dir', PROFILE_DIR],
        env: { POLKASWAP_MCP_HEADLESS: 'sometimes' },
      })
    ).toThrow(/must be true\/false/);
    expect(() =>
      parseBridgeConfig({
        argv: ['--profile-dir', PROFILE_DIR],
        env: { POLKASWAP_MCP_ALLOW_CUSTOM_ORIGIN: 'sometimes' },
      })
    ).toThrow(/must be true\/false/);
    expect(() =>
      parseBridgeConfig({
        argv: ['--profile-dir', PROFILE_DIR, '--ready-timeout-ms', '999'],
        env: {},
      })
    ).toThrow(/1000 to 120000/);
    expect(() =>
      parseBridgeConfig({
        argv: ['--profile-dir', PROFILE_DIR, '--tool-timeout-ms', '300001'],
        env: {},
      })
    ).toThrow(/1000 to 300000/);
  });

  it('prints help without requiring browser configuration', () => {
    expect(parseBridgeConfig({ argv: ['--help'], env: {} })).toEqual({ help: true });
  });
});
