import { execFileSync } from 'node:child_process';

import electronViteConfig from '@/../electron.vite.config.ts';
import { describe, expect, it } from 'vitest';

import viteConfig from '@/../vite.config.mjs';

describe('vite.config', () => {
  it.each([
    { args: ['--project', 'unit-scripts'], polyfillsEnabled: false },
    { args: ['--project=unit-scripts'], polyfillsEnabled: false },
    { args: ['--project=unit'], polyfillsEnabled: true },
  ])('selects Node polyfills correctly for $args', ({ args, polyfillsEnabled }) => {
    const script = `
      process.argv.push(...${JSON.stringify(args)});
      const { default: config } = await import('./vite.config.mjs');
      console.log(JSON.stringify(config.plugins.map(plugin => plugin.name)));
    `;
    const pluginNames = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, DISABLE_VITE_NODE_POLYFILLS: '0' },
      })
    );

    expect(pluginNames.includes('polkaswap:browser-node-polyfills')).toBe(polyfillsEnabled);
  });

  it('keeps Rollup on default chunking for the browser bundle', () => {
    expect(viteConfig.build?.rollupOptions?.output?.manualChunks).toBeUndefined();
  });

  it('scans only the application entry instead of retained HTML reports and previous builds', () => {
    expect(viteConfig.optimizeDeps?.entries).toEqual(['index.html']);
  });

  it('emits one CSS bundle for IPFS CDN reliability', () => {
    expect(viteConfig.build?.cssCodeSplit).toBe(false);
  });

  it('enforces the dependency security boundary in web and Electron renderer builds', () => {
    for (const plugins of [viteConfig.plugins, electronViteConfig.renderer?.plugins]) {
      expect(plugins).toContainEqual(
        expect.objectContaining({ name: 'polkaswap:dependency-security', apply: 'build' })
      );
    }
  });

  it('preloads dynamic import dependencies in parallel without the modulepreload polyfill', () => {
    expect(viteConfig.build?.modulePreload).toEqual({ polyfill: false });
  });

  it('pairs the browser crypto fallback with the Node polyfills', () => {
    const script = `
      process.argv.push('--project=unit');
      const { default: config } = await import('./vite.config.mjs');
      console.log(JSON.stringify(config.plugins.map(plugin => plugin.name)));
    `;
    const pluginNames: string[] = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, DISABLE_VITE_NODE_POLYFILLS: '0' },
      })
    );

    const fallbackIndex = pluginNames.indexOf('polkaswap:browser-crypto-fallback');
    expect(fallbackIndex).toBeGreaterThanOrEqual(0);
    expect(pluginNames.indexOf('polkaswap:browser-node-polyfills')).toBe(fallbackIndex + 1);
  });

  it('keeps Electron pointed at its dedicated main and renderer without a preload bridge', () => {
    expect(electronViteConfig.main?.build?.lib?.entry).toBe('electron/main/index.ts');
    expect(electronViteConfig.preload).toBeUndefined();
    expect(JSON.stringify(electronViteConfig.renderer?.build?.rollupOptions?.input)).toContain(
      'src/renderer/index.html'
    );
  });
});
