import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { Component, Vue } from 'vue-property-decorator';

import type { Color, ColorDirection, ColorType, DirectionType } from '@/consts/color';
import { state, getter } from '@/store/decorators';
import { getCssVariableValue as css } from '@/utils';

import store from '../../store';

@Component
export default class ThemePaletteMixin extends Vue {
  @state.settings.colorType colorType!: ColorType;
  @getter.libraryTheme libraryTheme!: Theme;

  get color(): ColorType {
    return store.state.settings.colorType;
  }

  set color(value: ColorType) {
    store.commit.settings.setColorType(value);
  }

  get direction(): DirectionType {
    return store.state.settings.colorDirection;
  }

  set direction(value: DirectionType) {
    store.commit.settings.setColorDirection(value);
  }

  get chartTheme() {
    const libraryTheme = this.libraryTheme;
    const currentColor = this.getColorPalette();

    const palette = {
      color: {
        theme: {
          accent: css('--s-color-theme-accent'),
          accentHover: css('--s-color-theme-accent-hover'),
        },
        base: {
          content: {
            primary: css('--s-color-base-content-primary'),
            secondary: css('--s-color-base-content-secondary'),
            tertiary: css('--s-color-base-content-tertiary'),
          },
          border: {
            secondary: css('--s-color-base-border-secondary'),
          },
          onAccent: css('--s-color-base-on-accent'),
        },
        utility: {
          body: css('--s-color-utility-body'),
        },
        status: {
          success: currentColor.side.buy,
          error: currentColor.side.sell,
          warning: css('--s-color-status-warning'),
          info: css('--s-color-status-info'),
        },
      },
      border: {
        radius: {
          mini: css('--s-border-radius-mini'),
        },
      },
      shadow: {
        dialog: css('--s-shadow-dialog'),
      },
    };

    return !!libraryTheme && palette;
  }

  isInversed = (value: boolean): boolean => {
    const direction = this.getColorDirection();

    return direction.type === 'classic' ? value : !value;
  };

  colors = (type?: ColorType, theme = Theme.LIGHT): any => {
    const palette = {
      classic: {
        name: 'Classic',
        type: 'classic',
        side: { buy: css('--s-color-classic-up'), sell: css('--s-color-classic-down') },
        priceChange: { up: css('--s-color-classic-price-change-up'), down: css('--s-color-classic-price-change-down') },
        bookBars: {
          buy: theme === Theme.LIGHT ? css('--s-color-classic-bar-light-buy') : css('--s-color-classic-bar-dark-buy'),
          sell:
            theme === Theme.LIGHT ? css('--s-color-classic-bar-light-sell') : css('--s-color-classic-bar-dark-sell'),
        },
      },
      deficiency: {
        name: 'Color deficiency',
        type: 'deficiency',
        side: { buy: css('--s-color-deficiency-up'), sell: css('--s-color-deficiency-down') },
        priceChange: {
          up: css('--s-color-deficiency-price-change-up'),
          down: css('--s-color-deficiency-price-change-down'),
        },
        bookBars: {
          buy:
            theme === Theme.LIGHT
              ? css('--s-color-deficiency-bar-light-buy')
              : css('--s-color-deficiency-bar-dark-buy'),
          sell:
            theme === Theme.LIGHT
              ? css('--s-color-deficiency-bar-light-sell')
              : css('--s-color-deficiency-bar-dark-sell'),
        },
      },
      traditional: {
        name: 'Traditional',
        type: 'traditional',
        side: { buy: css('--s-color-traditional-up'), sell: css('--s-color-traditional-down') },
        priceChange: {
          up: css('--s-color-traditional-price-change-up'),
          down: css('--s-color-tradtional-price-change-down'),
        },
        bookBars: {
          buy:
            theme === Theme.LIGHT
              ? css('--s-color-traditional-bar-light-buy')
              : css('--s-color-traditional-bar-dark-buy'),
          sell:
            theme === Theme.LIGHT
              ? css('--s-color-traditional-bar-light-sell')
              : css('--s-color-traditional-bar-dark-sell'),
        },
      },
    };

    if (!type) return palette;

    return palette[type];
  };

  directions: Record<DirectionType, ColorDirection> = {
    classic: { name: 'Green Up / Red down', type: 'classic' },
    inverse: { name: 'Green down / Red up', type: 'inverse' },
  };

  getColorDirection = (type?: DirectionType): ColorDirection => {
    return type ? this.directions[type] : this.directions[this.direction];
  };

  getColorPalette = (type?: ColorType, theme = Theme.LIGHT): Color => {
    return type ? this.colors(type, theme) : this.colors(this.color, theme);
  };
}
