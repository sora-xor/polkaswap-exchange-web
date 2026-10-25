import { describe, expect, it } from 'vitest';

import { default as Customise } from '@/components/shared/Widget/Customise.vue';
import { default as Grid } from '@/components/shared/Widget/Grid.vue';
import { default as PriceChart } from '@/components/shared/Widget/PriceChart.vue';
import { default as SupplyChart } from '@/components/shared/Widget/SupplyChart.vue';
import { default as TokenPriceChart } from '@/components/shared/Widget/TokenPriceChart.vue';
import {
  CustomiseWidget,
  PriceChartWidget,
  SupplyChartWidget,
  TokenPriceChartWidget,
  WidgetsGrid,
} from '@/shared/ui/widgets';

describe('shared widget entrypoints', () => {
  it('re-exports the live widget components', () => {
    expect(CustomiseWidget).toBe(Customise);
    expect(PriceChartWidget).toBe(PriceChart);
    expect(SupplyChartWidget).toBe(SupplyChart);
    expect(TokenPriceChartWidget).toBe(TokenPriceChart);
    expect(WidgetsGrid).toBe(Grid);
  });
});
