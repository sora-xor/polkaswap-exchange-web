// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../../..');

const files = {
  store: path.join(repoRoot, 'src', 'stores', 'moonpay', 'index.ts'),
  bridge: path.join(repoRoot, 'src', 'composables', 'useMoonpayBridge.ts'),
  depositOptions: path.join(repoRoot, 'src', 'features', 'deposit', 'pages', 'DepositOptionsPage.vue'),
  moonpay: path.join(repoRoot, 'src', 'features', 'deposit', 'components', 'moonpay', 'Moonpay.vue'),
  history: path.join(repoRoot, 'src', 'features', 'deposit', 'components', 'moonpay', 'MoonpayHistory.vue'),
  confirmation: path.join(repoRoot, 'src', 'features', 'deposit', 'components', 'moonpay', 'Confirmation.vue'),
  notification: path.join(repoRoot, 'src', 'features', 'deposit', 'components', 'moonpay', 'Notification.vue'),
} as const;

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('moonpay store migration', () => {
  it('keeps moonpay feature files off direct app-store imports', async () => {
    const featureSources = await Promise.all(
      [files.bridge, files.depositOptions, files.moonpay, files.history, files.confirmation, files.notification].map(
        readSource
      )
    );

    for (const source of featureSources) {
      expect(source).not.toContain("from '@/utils/app-store'");
      expect(source).not.toContain('requireAppStore(');
    }
  });

  it('routes moonpay feature state through the pinia moonpay store', async () => {
    const [
      storeSource,
      bridgeSource,
      depositOptionsSource,
      moonpaySource,
      historySource,
      confirmationSource,
      notificationSource,
    ] = await Promise.all(Object.values(files).map(readSource));

    expect(storeSource).toContain("defineStore('moonpay'");
    expect(storeSource).not.toContain("from '@/utils/app-store'");
    expect(storeSource).not.toContain('getAppStore(');
    expect(bridgeSource).toContain("from '@/stores/moonpay'");
    expect(depositOptionsSource).toContain("from '@/stores/moonpay'");
    expect(moonpaySource).toContain("from '@/stores/moonpay'");
    expect(historySource).toContain("from '@/stores/moonpay'");
    expect(confirmationSource).toContain("from '@/stores/moonpay'");
    expect(notificationSource).toContain("from '@/stores/moonpay'");
  });
});
