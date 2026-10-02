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

    expect(pluginNames.includes('vite-plugin-node-polyfills')).toBe(polyfillsEnabled);
  });

  it('keeps Rollup on default chunking for the browser bundle', () => {
    expect(viteConfig.build?.rollupOptions?.output?.manualChunks).toBeUndefined();
  });

  it('emits one CSS bundle for IPFS CDN reliability', () => {
    expect(viteConfig.build?.cssCodeSplit).toBe(false);
  });

  it('keeps Electron pointed at the dedicated main and preload entrypoints', () => {
    expect(electronViteConfig.main?.build?.lib?.entry).toBe('electron/main/index.ts');
    expect(electronViteConfig.preload?.build?.lib?.entry).toBe('electron/preload/index.ts');
    expect(JSON.stringify(electronViteConfig.renderer?.build?.rollupOptions?.input)).toContain(
      'src/renderer/index.html'
    );
  });
});
