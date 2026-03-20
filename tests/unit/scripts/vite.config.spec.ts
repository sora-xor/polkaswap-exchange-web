import electronViteConfig from '@/../electron.vite.config.ts';
import { describe, expect, it } from 'vitest';

import viteConfig from '@/../vite.config.mjs';

describe('vite.config', () => {
  it('does not force a custom manual chunk topology', () => {
    expect(viteConfig.build?.rollupOptions?.output?.manualChunks).toBeUndefined();
  });

  it('keeps Electron pointed at the dedicated main and preload entrypoints', () => {
    expect(electronViteConfig.main?.build?.lib?.entry).toBe('electron/main/index.ts');
    expect(electronViteConfig.preload?.build?.lib?.entry).toBe('electron/preload/index.ts');
    expect(JSON.stringify(electronViteConfig.renderer?.build?.rollupOptions?.input)).toContain(
      'src/renderer/index.html'
    );
  });
});
