import electronViteConfig from '@/../electron.vite.config.ts';
import { describe, expect, it } from 'vitest';

import viteConfig from '@/../vite.config.mjs';

describe('vite.config', () => {
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
