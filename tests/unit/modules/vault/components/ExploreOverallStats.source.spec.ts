import { describe, expect, it } from 'vitest';

import exploreOverallStatsSource from '@/modules/vault/components/ExploreOverallStats.vue?raw';

describe('ExploreOverallStats source styles', () => {
  it('keeps Kensetsu summary cards padded like the live site', () => {
    expect(exploreOverallStatsSource).toContain('<template #header>');
    expect(exploreOverallStatsSource).not.toContain('slot="header"');
    expect(exploreOverallStatsSource).toContain('shadow="never"');
    expect(exploreOverallStatsSource).toContain('.stats-column {');
    expect(exploreOverallStatsSource).toContain('border-style: none;');
    expect(exploreOverallStatsSource).toContain('flex-basis: calc(var(--s-col-span-width-current) + 6px);');
    expect(exploreOverallStatsSource).toContain('.stats-card {');
    expect(exploreOverallStatsSource).toContain('padding: $inner-spacing-mini $inner-spacing-small;');
    expect(exploreOverallStatsSource).toContain('box-shadow: var(--s-shadow-element-pressed);');
    expect(exploreOverallStatsSource).toContain(':deep(.el-card__header) {');
    expect(exploreOverallStatsSource).toContain('border-bottom: 1px solid transparent;');
    expect(exploreOverallStatsSource).toContain(':deep(.el-card__body) {');
    expect(exploreOverallStatsSource).toContain('padding: 0;');
  });
});
