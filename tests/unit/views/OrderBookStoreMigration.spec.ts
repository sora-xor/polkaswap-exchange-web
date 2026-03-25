// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

const files = {
  store: path.join(repoRoot, 'src', 'stores', 'orderBook', 'index.ts'),
  view: path.join(repoRoot, 'src', 'views', 'OrderBook.vue'),
  composable: path.join(repoRoot, 'src', 'composables', 'useOrderBookManagement.ts'),
  userOrdersComposable: path.join(repoRoot, 'src', 'composables', 'useOrderBookUserOrders.ts'),
} as const;

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('order-book store migration', () => {
  it('keeps the native order-book store off the app-store bridge helper', async () => {
    const source = await readSource(files.store);

    expect(source).not.toContain("from '@/utils/app-store'");
    expect(source).not.toContain('requireAppStore(');
    expect(source).not.toContain('withAppStore(');
  });

  it('routes the order-book view layer through the Pinia store facade', async () => {
    const [viewSource, composableSource, userOrdersSource] = await Promise.all([
      readSource(files.view),
      readSource(files.composable),
      readSource(files.userOrdersComposable),
    ]);

    expect(viewSource).toContain("from '@/stores/orderBook'");
    expect(composableSource).toContain("from '@/stores/orderBook'");
    expect(userOrdersSource).toContain("from '@/stores/orderBook'");
  });
});
