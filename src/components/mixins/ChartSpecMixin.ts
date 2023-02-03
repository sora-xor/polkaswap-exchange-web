import dayjs from 'dayjs';
import merge from 'lodash/fp/merge';
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import ThemePaletteMixin from '@/components/mixins/ThemePaletteMixin';

const AXIS_OFFSET = 8;
const AXIS_LABEL_CSS = {
  fontFamily: 'Sora',
  fontSize: 10,
  fontWeight: 300,
  lineHeigth: 1.5,
};

@Component
export default class ChartSpecMixin extends Mixins(ThemePaletteMixin, mixins.TranslationMixin) {
  gridSpec(options: any = {}) {
    return merge({
      top: 20,
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
          // TODO: "LT" formatted labels (hours) sometimes overlaps (AM\PM issue)
          const timeFormat = isNewMonth ? 'MMMM' : isNewDay ? 'D' : 'HH:mm';
          const formatted = this.formatDate(+value, timeFormat);

          if (isNewMonth) {
            return `{monthStyle|${formatted.charAt(0).toUpperCase() + formatted.slice(1)}}`;
          }
          if (isNewDay) {
            return `{dateStyle|${formatted}}`;
          }

          return formatted;
        },
        rich: {
          monthStyle: {
            fontSize: 10,
            fontWeight: 'bold',
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
