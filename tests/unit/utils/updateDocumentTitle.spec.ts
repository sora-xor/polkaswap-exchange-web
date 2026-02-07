import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTe = vi.hoisted(() => vi.fn());
const mockT = vi.hoisted(() => vi.fn());

vi.mock('@/lang', () => ({
  __esModule: true,
  default: {
    te: mockTe,
    t: mockT,
  },
}));

vi.mock('@/consts', () => ({
  app: { name: 'Polkaswap', title: 'Default Title' },
  TranslationConsts: {},
}));

import { registerDocumentTitleResolver, updateDocumentTitle } from '@/utils';

describe('updateDocumentTitle', () => {
  beforeEach(() => {
    mockTe.mockReset();
    mockT.mockReset();
    document.title = 'Initial';
    registerDocumentTitleResolver(null);
  });

  it('uses the registered route resolver when no route is provided', () => {
    mockTe.mockReturnValue(true);
    mockT.mockReturnValue('Swap');

    registerDocumentTitleResolver(() => ({ name: 'Swap' }));

    updateDocumentTitle();

    expect(mockTe).toHaveBeenCalledWith('pageTitle.Swap');
    expect(document.title).toBe('Swap - Polkaswap');
  });

  it('falls back to the default title when no translation is available', () => {
    mockTe.mockReturnValue(false);
    registerDocumentTitleResolver(() => ({ name: 'Unknown' }));

    updateDocumentTitle();

    expect(document.title).toBe('Default Title');
  });
});
