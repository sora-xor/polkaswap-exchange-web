import { describe, expect, it } from 'vitest';

import actionsMenuSource from '@/lib/soraneo-wallet/src/components/Account/ActionsMenu.vue?raw';

describe('ActionsMenu source', () => {
  it('keeps the wallet action menu wrapper on the production sizing contract', () => {
    expect(actionsMenuSource).not.toMatch(/width:\s*24px/);
    expect(actionsMenuSource).not.toMatch(/height:\s*24px/);
    expect(actionsMenuSource).not.toMatch(/font-size:\s*24px/);
  });
});
