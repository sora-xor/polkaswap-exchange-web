import { Component, Vue } from 'vue-property-decorator';

import { getter } from '@/store/decorators';
import { getCssVariableValue as css } from '@/utils';

import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

@Component
export default class ThemePaletteMixin extends Vue {
  @getter.libraryTheme libraryTheme!: Theme;

  get theme() {
    const libraryTheme = this.libraryTheme;

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
          success: css('--s-color-status-success'),
          error: css('--s-color-status-error'),
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
