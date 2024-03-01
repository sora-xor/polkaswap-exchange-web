import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { Component, Vue, Watch } from 'vue-property-decorator';

import type { Color, ColorDirection, ColorType, DirectionType } from '@/consts/color';
import { state, getter } from '@/store/decorators';
import { getCssVariableValue as css } from '@/utils';

import store from '../../store';

@Component
export default class ThemePaletteMixin extends Vue {
  @state.settings.colorType colorType!: ColorType;
  @getter.libraryTheme libraryTheme!: Theme;

  theme;

  @Watch('libraryTheme')
  private setTheme() {
    this.theme = this.libraryTheme;
  }

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

  isInversed = (value: boolean): boolean => {
    const direction = this.getColorDirection();

    return direction.type === 'classic' ? value : !value;
  };

  isThemeLight(): boolean {
    return this.theme === Theme.LIGHT;
  }

  colors: Record<ColorType, Color> = {
    classic: {
      name: 'Classic',
      type: 'classic',
      side: { buy: '#34AD87', sell: '#F754A3' },
      priceChange: { up: '#24DAA0', down: '#f8087b' },
      bookBars: {
        buy: this.isThemeLight() ? 'rgba(185, 235, 219, 0.4)' : 'rgba(1, 202, 139, 0.2)',
        sell: this.isThemeLight() ? 'rgba(255, 216, 235, 0.8)' : 'rgba(255, 0, 124, 0.3)',
      },
    },
    deficiency: {
      name: 'Color deficiency',
      type: 'deficiency',
      side: { buy: '#448BF1', sell: '#D07F3E' },
      priceChange: { up: '#448BF1', down: '#D07F3E' },
    },
    traditional: {
      name: 'Traditional',
      type: 'traditional',
      side: { buy: '#75A390', sell: '#EB001B' },
      priceChange: { up: '#75A390', down: '#EB001B' },
    },
  };

  directions: Record<DirectionType, ColorDirection> = {
    classic: { name: 'Green Up / Red down', type: 'classic' },
    inverse: { name: 'Green down / Red up', type: 'inverse' },
  };

  getColorDirection = (type?: DirectionType): ColorDirection => {
    return type ? this.directions[type] : this.directions[this.direction];
  };

  getColorPalette = (type?: ColorType): Color => {
    return type ? this.colors[type] : this.colors[this.color];
  };

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
}
