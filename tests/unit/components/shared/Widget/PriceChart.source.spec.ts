import { describe, expect, it } from 'vitest';

import priceChartSource from '@/components/shared/Widget/PriceChart.vue?raw';

describe('PriceChart source', () => {
  it('uses direct shared component imports instead of the lazy registry', () => {
    expect(priceChartSource).not.toContain('lazyComponent(');
    expect(priceChartSource).not.toContain('Components.');
    expect(priceChartSource).not.toContain("from '@/router'");
    expect(priceChartSource).toContain("import BaseWidget from '@/components/shared/Widget/Base.vue';");
    expect(priceChartSource).toContain(
      "import SvgIconButton from '@/components/shared/Button/SvgIconButton/SvgIconButton.vue';"
    );
    expect(priceChartSource).toContain("import TokensRow from '@/components/shared/TokensRow.vue';");
    expect(priceChartSource).toContain("import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';");
    expect(priceChartSource).toContain("import ChartSkeleton from '@/components/shared/Chart/ChartSkeleton.vue';");
  });
});
