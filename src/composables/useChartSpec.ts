import dayjs from 'dayjs/esm';
import merge from 'lodash/fp/merge';

import { createThemePalette, useThemePalette } from '@/composables/useThemePalette';
import { useTranslation } from '@/composables/useTranslation';
import { capitalize } from '@/utils';

const LABEL_PADDING = 4;
const AXIS_OFFSET = 8;
const AXIS_LABEL_CSS = {
  fontFamily: 'Sora',
  fontSize: 10,
  fontWeight: 300,
  lineHeigth: 1.5,
};

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

type ChartOptions = Record<string, unknown>;

type AxisLabelFormatter = (value: number) => string;

/**
 * Provides ECharts configuration helpers previously offered via
 * `ChartSpecMixin`. Consumers can combine the helpers with custom
 * options while inheriting theme-aware defaults.
 */
export function useChartSpec() {
  const { formatDate } = useTranslation();
  const { theme } = useThemePalette();

  const resolveTheme = () => theme.value ?? createThemePalette();

  const gridSpec = (options: ChartOptions = {}) =>
    merge({
      left: 0,
      right: 0,
      bottom: 20 + AXIS_OFFSET,
    })(options);

  const xAxisSpec = (options: ChartOptions = {}) => {
    const palette = resolveTheme();

    return merge({
      type: 'time',
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        formatter: ((value: number) => {
          const date = dayjs(+value);
          const isNewDay = date.hour() === 0 && date.minute() === 0;
          const isNewMonth = date.date() === 1 && isNewDay;
          const timeFormat = isNewMonth ? 'MMM YY' : isNewDay ? 'D MMM' : 'HH:mm';
          const formatted = formatDate(+value, timeFormat);

          if (isNewMonth) {
            return `{monthStyle|${capitalize(formatted)}}`;
          }
          if (isNewDay) {
            return `{dateStyle|${formatted}}`;
          }

          return formatted;
        }) as AxisLabelFormatter,
        hideOverlap: true,
        rich: {
          monthStyle: {
            fontSize: 10,
            fontWeight: 'bold',
            marginTop: 10,
          },
          dateStyle: {
            fontSize: 10,
            fontWeight: 'bold',
          },
        },
        color: palette.color.base.content.secondary,
        offset: AXIS_OFFSET,
        ...AXIS_LABEL_CSS,
      },
      axisPointer: {
        lineStyle: {
          color: palette.color.status.success,
        },
        label: {
          show: true,
          backgroundColor: palette.color.status.success,
          color: palette.color.base.onAccent,
          fontSize: 11,
          fontWeight: 400,
          lineHeigth: 1.5,
          formatter: ({ value }: { value: number }) => formatDate(+value, 'LLL'),
        },
      },
      boundaryGap: false,
    })(options);
  };

  const yAxisSpec = (options: ChartOptions = {}) => {
    const palette = resolveTheme();

    return merge({
      type: 'value',
      offset: AXIS_OFFSET,
      scale: true,
      axisLabel: {
        ...AXIS_LABEL_CSS,
        hideOverlap: true,
        margin: 0,
        padding: LABEL_PADDING - 1,
      },
      axisLine: {
        lineStyle: {
          color: palette.color.base.content.secondary,
        },
      },
      axisPointer: {
        lineStyle: {
          color: palette.color.status.success,
        },
        label: {
          ...AXIS_LABEL_CSS,
          backgroundColor: palette.color.status.success,
          fontWeight: 400,
          padding: [LABEL_PADDING, LABEL_PADDING],
          color: palette.color.base.onAccent,
        },
      },
      splitLine: {
        lineStyle: {
          color: palette.color.base.content.tertiary,
          opacity: 0.2,
        },
      },
    })(options);
  };

  const tooltipSpec = (options: ChartOptions = {}) => {
    const palette = resolveTheme();

    return merge({
      show: true,
      trigger: 'axis',
      backgroundColor: palette.color.utility.body,
      borderColor: palette.color.base.border.secondary,
      extraCssText: `box-shadow: ${palette.shadow.dialog}; border-radius: ${palette.border.radius.mini}`,
      textStyle: {
        color: palette.color.base.content.secondary,
        fontSize: 11,
        fontFamily: 'Sora',
        fontWeight: 400,
      },
    })(options);
  };

  const seriesSpec = (options: ChartOptions = {}) => {
    const palette = resolveTheme();

    return merge({
      encode: {
        y: 'value',
      },
      showSymbol: false,
      itemStyle: {
        color: palette.color.theme.accent,
      },
    })(options);
  };

  const lineSeriesSpec = (options: ChartOptions = {}) => seriesSpec({ type: 'line', ...options });

  const barSeriesSpec = (options: ChartOptions = {}) => seriesSpec({ type: 'bar', ...options });

  const candlestickSeriesSpec = (options: ChartOptions = {}) => {
    const palette = resolveTheme();

    return merge({
      type: 'candlestick',
      barMaxWidth: 10,
      itemStyle: {
        color: palette.color.status.success,
        borderColor: palette.color.status.success,
        color0: palette.color.theme.accentHover,
        borderColor0: palette.color.theme.accentHover,
        borderWidth: 2,
      },
    })(options);
  };

  return {
    gridSpec,
    xAxisSpec,
    yAxisSpec,
    tooltipSpec,
    seriesSpec,
    lineSeriesSpec,
    barSeriesSpec,
    candlestickSeriesSpec,
  };
}

export type ChartSpecComposable = ReturnType<typeof useChartSpec>;
