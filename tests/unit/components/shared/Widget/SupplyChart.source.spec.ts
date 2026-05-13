import { describe, expect, it } from 'vitest';

import supplyChartSource from '@/components/shared/Widget/SupplyChart.vue?raw';

describe('SupplyChart source', () => {
  it('uses direct shared component imports instead of the lazy registry', () => {
    expect(supplyChartSource).not.toContain('lazyComponent(');
    expect(supplyChartSource).not.toContain('Components.');
    expect(supplyChartSource).not.toContain("from '@/router'");
    expect(supplyChartSource).toContain("import BaseWidget from '@/components/shared/Widget/Base.vue';");
    expect(supplyChartSource).toContain("import ChartSkeleton from '@/components/shared/Chart/ChartSkeleton.vue';");
    expect(supplyChartSource).toContain("import PriceChange from '@/components/shared/PriceChange.vue';");
    expect(supplyChartSource).toContain("import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';");
    expect(supplyChartSource).toContain(
      "import TokenSelectButton from '@/components/shared/Input/TokenSelectButton.vue';"
    );
    expect(supplyChartSource).toContain("import SelectToken from '@/components/shared/SelectAsset/SelectToken.vue';");
  });

  it('refreshes supply data when the runtime indexer endpoint changes', () => {
    expect(supplyChartSource).toContain('const indexerEndpoint = computed(() => {');
    expect(supplyChartSource).toContain('watch(indexerEndpoint, (endpoint, previousEndpoint) => {');
    expect(supplyChartSource).toContain('if (!endpoint || endpoint === previousEndpoint) return;');
    expect(supplyChartSource).toContain('updateData();');
  });
});
