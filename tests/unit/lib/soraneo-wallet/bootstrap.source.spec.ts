import { describe, expect, it } from 'vitest';

import bootstrapSource from '@/lib/soraneo-wallet/src/bootstrap.ts?raw';

describe('wallet bootstrap source', () => {
  it('keeps the core barrel and WalletConnect service out of static bootstrap imports', () => {
    expect(bootstrapSource).not.toContain("from './core'");
    expect(bootstrapSource).toContain("import('./services/walletconnect')");
    expect(bootstrapSource).toContain("import('./services/google/wallet')");
    expect(bootstrapSource).not.toContain("from './services/google/wallet'");
  });
});
