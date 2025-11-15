import { describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

const mockTheme = {
  color: {
    theme: {
      accent: '#accent',
      accentHover: '#accent-hover',
    },
    base: {
      content: {
        primary: '#primary',
        secondary: '#secondary',
        tertiary: '#tertiary',
      },
      border: {
        secondary: '#border',
      },
      onAccent: '#on-accent',
    },
    utility: {
      body: '#utility',
    },
    status: {
      success: '#success',
      error: '#error',
      warning: '#warning',
      info: '#info',
    },
  },
  border: {
    radius: {
      mini: '4px',
    },
  },
  shadow: {
    dialog: '0 0 10px rgba(0,0,0,0.2)',
  },
} as const;

vi.mock('@soramitsu-ui/ui', () => ({}), { virtual: true });

vi.mock(
  '@/composables/useThemePalette',
  () => ({
    useThemePalette: () => ({
      theme: computed(() => mockTheme),
    }),
    createThemePalette: () => mockTheme,
  }),
  { virtual: true }
);

vi.mock(
  '@/composables/useTranslation',
  () => ({
    useTranslation: () => ({
      formatDate: (value: number, format?: string) => `formatted-${value}-${format ?? ''}`,
    }),
  }),
  { virtual: true }
);

import { useChartSpec } from '@/composables/useChartSpec';

describe('useChartSpec', () => {
  it('builds grid specs with defaults and overrides', () => {
    const composable = useChartSpec();

    expect(composable.gridSpec()).toMatchObject({
      left: 0,
      bottom: 28,
    });
    expect(composable.gridSpec({ left: 10 })).toMatchObject({
      left: 10,
      bottom: 28,
    });
  });

  it('produces themed axis specs', () => {
    const composable = useChartSpec();
    const xAxis = composable.xAxisSpec();
    const yAxis = composable.yAxisSpec();

    expect(xAxis.axisLabel.color).toBe('#secondary');
    expect(xAxis.axisPointer.label.backgroundColor).toBe('#success');
    expect((xAxis.axisLabel.formatter as (value: number) => string)(1700000000000)).toContain(
      'formatted-1700000000000'
    );
    expect(yAxis.axisLine.lineStyle.color).toBe('#secondary');
    expect(yAxis.splitLine.lineStyle.color).toBe('#tertiary');
  });

  it('merges tooltip styling with theme palette', () => {
    const composable = useChartSpec();
    const tooltip = composable.tooltipSpec();

    expect(tooltip.backgroundColor).toBe('#utility');
    expect(tooltip.borderColor).toBe('#border');
    expect(tooltip.extraCssText).toContain('0 0 10px');
    expect(tooltip.extraCssText).toContain('4px');
  });

  it('applies palette colors to series helpers', () => {
    const composable = useChartSpec();
    const baseSeries = composable.seriesSpec();
    const lineSeries = composable.lineSeriesSpec({ smooth: true });
    const barSeries = composable.barSeriesSpec({ barWidth: 12 });
    const candleSeries = composable.candlestickSeriesSpec();

    expect(baseSeries.itemStyle.color).toBe('#accent');
    expect((lineSeries as any).type).toBe('line');
    expect((lineSeries as any).smooth).toBe(true);
    expect((barSeries as any).type).toBe('bar');
    expect((barSeries as any).barWidth).toBe(12);
    expect(candleSeries.itemStyle.color0).toBe('#accent-hover');
    expect(candleSeries.itemStyle.borderColor).toBe('#success');
  });
});
