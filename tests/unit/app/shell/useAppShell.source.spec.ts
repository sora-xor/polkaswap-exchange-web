import { describe, expect, it } from 'vitest';

import useAppShellSource from '@/app/shell/useAppShell.ts?raw';

describe('useAppShell source', () => {
  it('starts runtime services without blocking the initial shell render', () => {
    expect(useAppShellSource).toContain('void bootstrapRuntimeServices({');
    expect(useAppShellSource).not.toContain('await bootstrapRuntimeServices({');
  });

  it('loads the alert service through an async boundary', () => {
    expect(useAppShellSource).toContain("import('@/lib/soraneo-wallet/src/services/alerts')");
    expect(useAppShellSource).not.toContain("import AlertsApiService from '@/lib/soraneo-wallet/src/services/alerts'");
  });

  it('keeps wallet and realtime modules out of the static shell graph', () => {
    expect(useAppShellSource).toContain("import('@/lib/soraneo-wallet/src/api')");
    expect(useAppShellSource).toContain("import('@/lib/soraneo-wallet/src/bootstrap')");
    expect(useAppShellSource).toContain("import('@/services/realtime')");
    expect(useAppShellSource).toContain("import('@/composables/useTransaction')");
    expect(useAppShellSource).not.toContain("import { api, connection } from '@/lib/soraneo-wallet/src/api'");
    expect(useAppShellSource).not.toContain("import { initWallet, waitForCore } from '@/lib/soraneo-wallet/src/bootstrap'");
    expect(useAppShellSource).not.toContain("from '@/services/realtime';");
    expect(useAppShellSource).not.toContain("from '@/composables/useTransaction';");
  });
});
