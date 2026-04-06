import { describe, expect, it } from 'vitest';

import appHeaderMenuSource from '@/components/App/Header/AppHeaderMenu.vue?raw';

describe('AppHeaderMenu source', () => {
  it('hard-centers the desktop settings close button icon', () => {
    expect(appHeaderMenuSource).toContain('class="header-menu__settings-close s-pressed"');
    expect(appHeaderMenuSource).toMatch(
      /&__settings-close\.el-button\.s-action\s*\{\s*display:\s*inline-flex;\s*align-items:\s*center;\s*justify-content:\s*center;\s*width:\s*42px;\s*min-width:\s*42px;\s*height:\s*42px;\s*min-height:\s*42px;\s*padding:\s*0;\s*\}/s
    );
    expect(appHeaderMenuSource).toMatch(
      /&__settings-close \.s-button__icon\s*\{\s*display:\s*inline-flex;\s*align-items:\s*center;\s*justify-content:\s*center;\s*width:\s*100%;\s*height:\s*100%;\s*\}/s
    );
    expect(appHeaderMenuSource).toMatch(
      /&__settings-close \.s-button__icon > i\s*\{\s*font-size:\s*24px !important;\s*line-height:\s*24px !important;\s*\}/s
    );
  });
});
