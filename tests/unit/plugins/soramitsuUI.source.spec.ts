import { describe, expect, it } from 'vitest';

import soramitsuUiPluginSource from '@/plugins/soramitsuUI.ts?raw';

describe('soramitsuUI plugin source', () => {
  it('registers the UI component library lazily', () => {
    expect(soramitsuUiPluginSource).toContain('import.meta.glob<ComponentModule>');
    expect(soramitsuUiPluginSource).toContain('registerLazySoramitsuComponents(app)');
    expect(soramitsuUiPluginSource).not.toContain("plugin as soramitsuUIPlugin");
    expect(soramitsuUiPluginSource).not.toContain('app.use(soramitsuUIPlugin())');
  });

  it('does not include intentionally excluded heavy editor components', () => {
    expect(soramitsuUiPluginSource).toContain('!../lib/soramitsu-ui/components/JsonInput/**');
  });
});
