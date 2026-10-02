import { describe, expect, it } from 'vitest';

import booksSource from '@/features/explore/pages/ExploreBooksPage.vue?raw';
import demeterSource from '@/features/explore/pages/ExploreDemeterPage.vue?raw';
import poolsSource from '@/features/explore/pages/ExplorePoolsPage.vue?raw';
import tokensSource from '@/features/explore/pages/ExploreTokensPage.vue?raw';

describe('Explore data refresh wiring', () => {
  it.each([
    ['books', booksSource],
    ['demeter', demeterSource],
    ['pools', poolsSource],
    ['tokens', tokensSource],
  ])('coalesces %s source changes instead of dropping them while loading', (_name, source) => {
    expect(source).toContain('createCoalescedAsyncTask(async () =>');
    expect(source).not.toContain('if (loading.value) return');
  });
});
