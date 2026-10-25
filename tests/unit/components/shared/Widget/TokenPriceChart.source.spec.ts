import { describe, expect, it } from 'vitest';

import tokenPriceChartSource from '@/components/shared/Widget/TokenPriceChart.vue?raw';

describe('TokenPriceChart source', () => {
  it('uses direct shared component imports instead of the lazy registry', () => {
    expect(tokenPriceChartSource).not.toContain('lazyComponent(');
    expect(tokenPriceChartSource).not.toContain('Components.');
    expect(tokenPriceChartSource).not.toContain("from '@/router'");
    expect(tokenPriceChartSource).toContain(
      "import SelectToken from '@/components/shared/SelectAsset/SelectToken.vue';"
    );
    expect(tokenPriceChartSource).toContain(
      "import TokenSelectButton from '@/components/shared/Input/TokenSelectButton.vue';"
    );
    expect(tokenPriceChartSource).toContain(
      "import PriceChartWidget from '@/components/shared/Widget/PriceChart.vue';"
    );
  });
});
