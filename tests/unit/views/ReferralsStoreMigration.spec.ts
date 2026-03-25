// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

const files = {
  store: path.join(repoRoot, 'src', 'stores', 'referrals', 'index.ts'),
  app: path.join(repoRoot, 'src', 'App.vue'),
  program: path.join(repoRoot, 'src', 'views', 'ReferralProgram.vue'),
  bonding: path.join(repoRoot, 'src', 'views', 'ReferralBonding.vue'),
  invite: path.join(repoRoot, 'src', 'components', 'pages', 'Referrals', 'ConfirmInviteUser.vue'),
  confirm: path.join(repoRoot, 'src', 'components', 'pages', 'Referrals', 'ConfirmBonding.vue'),
} as const;

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('referrals store migration', () => {
  it('keeps referral feature files off direct app-store imports', async () => {
    const featureSources = await Promise.all(
      [files.program, files.bonding, files.invite, files.confirm].map(readSource)
    );

    for (const source of featureSources) {
      expect(source).not.toContain("from '@/utils/app-store'");
      expect(source).not.toContain('requireAppStore(');
    }
  });

  it('routes referral feature state through the pinia referrals store', async () => {
    const [storeSource, appSource, programSource, bondingSource, inviteSource, confirmSource] = await Promise.all(
      Object.values(files).map(readSource)
    );

    expect(storeSource).toContain("defineStore('referrals-legacy'");
    expect(storeSource).not.toContain("from '@/utils/app-store'");
    expect(storeSource).toContain("from '@/stores/wallet'");
    expect(appSource).toContain("from '@/stores/referrals'");
    expect(programSource).toContain("from '@/stores/referrals'");
    expect(bondingSource).toContain("from '@/stores/referrals'");
    expect(inviteSource).toContain("from '@/stores/referrals'");
    expect(confirmSource).toContain("from '@/stores/referrals'");
  });
});
