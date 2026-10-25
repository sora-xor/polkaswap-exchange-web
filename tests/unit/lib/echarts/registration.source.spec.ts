import { describe, expect, it } from 'vitest';

import localChartRegistration from '@/lib/echarts/component.ts?raw';
import pluginChartRegistration from '@/plugins/echarts.ts?raw';

describe('ECharts registration', () => {
  it('registers dataset support for dataset-backed chart options', () => {
    for (const source of [localChartRegistration, pluginChartRegistration]) {
      expect(source).toContain('DatasetComponent');
      expect(source).toContain('DatasetComponent,');
    }
  });
});
