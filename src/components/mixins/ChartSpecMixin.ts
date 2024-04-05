import dayjs from 'dayjs';
import merge from 'lodash/fp/merge';
import { Component, Mixins } from 'vue-property-decorator';

import ThemePaletteMixin from '@/components/mixins/ThemePaletteMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

const LABEL_PADDING = 4;
const AXIS_OFFSET = 8;
const AXIS_LABEL_CSS = {
  fontFamily: 'Sora',
  fontSize: 10,
  fontWeight: 300,
  lineHeigth: 1.5,
};

@Component
export default class ChartSpecMixin extends Mixins(ThemePaletteMixin, TranslationMixin) {
  gridSpec(options: any = {}) {
    return merge({
      left: 0,
      right: 0,
      bottom: 20 + AXIS_OFFSET,
    })(options);
  }

  xAxisSpec(options: any = {}) {
    return merge({
      type: 'time',
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        formatter: (value) => {
          const date = dayjs(+value);
          const isNewDay = date.hour() === 0 && date.minute() === 0;
          const isNewMonth = date.date() === 1 && isNewDay;
          const timeFormat = isNewMonth ? 'MMM' : isNewDay ? 'D' : 'HH:mm';
          const formatted = this.formatDate(+value, timeFormat);

          if (isNewMonth) {
            return `{monthStyle|${formatted.charAt(0).toUpperCase() + formatted.slice(1)}}`;
          }
          if (isNewDay) {
            return `{dateStyle|${formatted}}`;
          }

          return formatted;
        },
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
        color: this.theme.color.base.content.secondary,
        offset: AXIS_OFFSET,
        ...AXIS_LABEL_CSS,
      },
      axisPointer: {
        lineStyle: {
          color: this.theme.color.status.success,
        },
        label: {
          show: true,
          backgroundColor: this.theme.color.status.success,
          color: this.theme.color.base.onAccent,
          fontSize: 11,
          fontWeight: 400,
          lineHeigth: 1.5,
          formatter: ({ value }) => {
            return this.formatDate(+value, 'LLL'); // locale format
          },
        },
      },
      boundaryGap: false,
    })(options);
  }

  yAxisSpec(options: any = {}) {
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
          color: this.theme.color.base.content.secondary,
        },
      },
      axisPointer: {
        lineStyle: {
          color: this.theme.color.status.success,
        },
        label: {
          ...AXIS_LABEL_CSS,
          backgroundColor: this.theme.color.status.success,
          fontWeight: 400,
          padding: [LABEL_PADDING, LABEL_PADDING],
          color: this.theme.color.base.onAccent,
        },
      },
      splitLine: {
        lineStyle: {
          color: this.theme.color.base.content.tertiary,
          opacity: 0.2,
        },
      },
    })(options);
  }

  tooltipSpec(options: any = {}) {
    return merge({
      show: true,
      trigger: 'axis',
      backgroundColor: this.theme.color.utility.body,
      borderColor: this.theme.color.base.border.secondary,
      extraCssText: `box-shadow: ${this.theme.shadow.dialog}; border-radius: ${this.theme.border.radius.mini}`,
      textStyle: {
        color: this.theme.color.base.content.secondary,
        fontSize: 11,
        fontFamily: 'Sora',
        fontWeight: 400,
      },
    })(options);
  }

  seriesSpec(options: any = {}) {
    return merge({
      encode: {
        y: 'value',
      },
      showSymbol: false,
      itemStyle: {
        color: this.theme.color.theme.accent,
      },
    })(options);
  }

  depthSeriesSpec(options: any = {}) {
    return merge({
      animation: false,
      dataZoom: {
        id: 'dataZoomDepthChart',
        type: 'inside',
      },
      grid: {
        left: '1%',
        right: '1%',
        bottom: '3%',
        containLabel: true,
      },
    })(options);
  }

  lineSeriesSpec(options: any = {}) {
    return merge({
      type: 'line',
      encode: {
        y: 'value',
      },
      showSymbol: false,
      itemStyle: {
        color: this.theme.color.theme.accent,
      },
    })(options);
  }

  barSeriesSpec(options: any = {}) {
    return merge({
      type: 'bar',
      encode: {
        y: 'value',
      },
      showSymbol: false,
      itemStyle: {
        color: this.theme.color.theme.accent,
      },
    })(options);
  }

  candlestickSeriesSpec(options: any = {}) {
    return merge({
      type: 'candlestick',
      barMaxWidth: 10,
      itemStyle: {
        color: this.theme.color.status.success,
        borderColor: this.theme.color.status.success,
        color0: this.theme.color.theme.accentHover,
        borderColor0: this.theme.color.theme.accentHover,
        borderWidth: 2,
      },
    })(options);
  }
}
