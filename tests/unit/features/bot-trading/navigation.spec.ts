import { describe, expect, it } from 'vitest';
import { botLabDraftLocation, readBotNavigation } from '@/features/bot-trading/navigation';

describe('public Lab draft navigation', () => {
  it('preserves exact and repeated draft query values during harmless panel navigation only', () => {
    const study = ['one', 'two'];
    expect(
      botLabDraftLocation(
        { strategy: 'sma', composer: false },
        { study, rules: 'legacy', wallet: 'private', panel: 'composer' }
      ).query
    ).toEqual({ strategy: 'sma', study, rules: 'legacy' });
    expect(botLabDraftLocation({ strategy: 'dca', composer: true }, {}).query).toEqual({
      strategy: 'dca',
      panel: 'composer',
    });
  });
  it.each([{ study: '' }, { study: null }, { study: ['duplicate', 'duplicate'] }, { rules: '' }])(
    'opens Lab to visibly reject a present invalid draft %o',
    (query) => {
      expect(readBotNavigation(undefined, query).view).toBe('lab');
    }
  );
});
