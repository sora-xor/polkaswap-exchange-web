import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import english from '@/lang/en.json';

const mockTe = vi.hoisted(() => vi.fn());
const mockT = vi.hoisted(() => vi.fn());

vi.mock('@/lang', () => ({
  __esModule: true,
  default: {
    te: mockTe,
    t: mockT,
  },
}));

vi.mock('@/consts/app', () => ({
  app: { name: 'Polkaswap', title: 'Default Title' },
  TranslationConsts: {},
}));

import { registerDocumentTitleResolver, updateDocumentTitle } from '@/utils/documentTitle';

describe('updateDocumentTitle', () => {
  beforeEach(() => {
    mockTe.mockReset();
    mockT.mockReset();
    document.title = 'Initial';
    registerDocumentTitleResolver(null);
  });

  it('uses the registered route resolver when no route is provided', async () => {
    mockTe.mockReturnValue(true);
    mockT.mockReturnValue('Swap');

    registerDocumentTitleResolver(() => ({ name: 'Swap' }));

    await updateDocumentTitle();

    expect(mockTe).toHaveBeenCalledWith('pageTitle.Swap');
    expect(document.title).toBe('Swap - Polkaswap');
  });

  it('resolves the Points route title through the shipped English catalog', async () => {
    const { global: composer } = createI18n({ legacy: false, locale: 'en', messages: { en: english } });
    mockTe.mockImplementation((key: string) => composer.te(key));
    mockT.mockImplementation((key: string) => composer.t(key));
    await updateDocumentTitle({ name: 'PointSystemWrapper' });
    expect(document.title).toBe('Points - Polkaswap');
  });

  it('falls back to the default title when no translation is available', async () => {
    mockTe.mockReturnValue(false);
    registerDocumentTitleResolver(() => ({ name: 'Unknown' }));

    await updateDocumentTitle();

    expect(document.title).toBe('Default Title');
  });
});
