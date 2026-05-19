import { describe, expect, it } from 'vitest';

import appHeaderMenuSource from '@/components/App/Header/AppHeaderMenu.vue?raw';

describe('AppHeaderMenu source', () => {
  it('eagerly imports the settings menu controls instead of waiting on global async components', () => {
    expect(appHeaderMenuSource).toContain("import SButton from '@/lib/soramitsu-ui/components/Button/SButton.vue';");
    expect(appHeaderMenuSource).toContain("import SDropdown from '@/lib/soramitsu-ui/components/Select/SDropdown.vue';");
    expect(appHeaderMenuSource).toContain("import SDropdownItem from '@/lib/soramitsu-ui/components/Select/SDropdownItem.vue';");
    expect(appHeaderMenuSource).toContain("import SIcon from '@/lib/soramitsu-ui/components/Icon/SIcon.vue';");
    expect(appHeaderMenuSource).toContain("import SSwitch from '@/lib/soramitsu-ui/components/Switch/SSwitch.vue';");
    expect(appHeaderMenuSource).not.toContain('createAsyncComponent');
  });

  it('keeps the settings close button geometry aligned with the live site', () => {
    expect(appHeaderMenuSource).toContain('class="header-menu__settings-close s-pressed"');
    expect(appHeaderMenuSource).toContain(':aria-label="t(\'headerMenu.settings\')"');
    expect(appHeaderMenuSource).toContain(':aria-label="t(\'closeText\')"');
    expect(appHeaderMenuSource).toMatch(
      /&__settings-close\.el-button\.s-action\s*\{\s*display:\s*block;\s*width:\s*42px;\s*min-width:\s*auto;\s*height:\s*42px;\s*min-height:\s*42px;\s*padding:\s*0;\s*color:\s*var\(--s-color-base-content-tertiary\) !important;\s*font-weight:\s*500;\s*line-height:\s*14px;\s*\}/s
    );
    expect(appHeaderMenuSource).toMatch(
      /&__settings-close \.s-button__icon\s*\{\s*display:\s*inline;\s*width:\s*auto;\s*height:\s*auto;\s*\}/s
    );
    expect(appHeaderMenuSource).toMatch(
      /&__settings-close \.s-button__icon > i\s*\{\s*display:\s*inline-block;\s*color:\s*var\(--s-color-base-content-tertiary\) !important;\s*font-size:\s*24px !important;\s*line-height:\s*24px !important;\s*\}/s
    );
  });

  it('keeps the mobile settings drawer geometry aligned with the live site', () => {
    expect(appHeaderMenuSource).toContain('@include large-mobile(true) {');
    expect(appHeaderMenuSource).toContain('transition: transform 0.2s cubic-bezier(0.22, 0.77, 0.81, 0.61);');
    expect(appHeaderMenuSource).toContain('right: -272px !important;');
    expect(appHeaderMenuSource).toContain('margin-top: 12px !important;');
    expect(appHeaderMenuSource).toContain('width: 264px;');
    expect(appHeaderMenuSource).toContain('transform: translateX(-264px) !important;');
    expect(appHeaderMenuSource).toContain('padding: 6px 0 !important;');
    expect(appHeaderMenuSource).toContain('color: #000;');
    expect(appHeaderMenuSource).toMatch(/\.s-dropdown-menu\s*\{\s*margin:\s*0;\s*padding:\s*0;\s*\}/s);
  });

  it('keeps local dropdown item wrappers visually equivalent to live icons and dividers', () => {
    expect(appHeaderMenuSource).toMatch(/&\.s-dropdown-menu__item\s*\{\s*gap:\s*0;\s*\}/s);
    expect(appHeaderMenuSource).toMatch(
      /\.el-dropdown-menu__icon\s*\{\s*width:\s*auto !important;\s*height:\s*auto !important;\s*margin-right:\s*5px;\s*font-size:\s*\$icon-size !important;\s*line-height:\s*\$icon-size !important;\s*\}/s
    );
    expect(appHeaderMenuSource).toMatch(
      /\.el-divider--horizontal\s*\{\s*margin:\s*unset;\s*height:\s*1px;\s*background-color:\s*var\(--s-color-base-border-secondary\);\s*\}/s
    );
  });

  it('mirrors the settings toolbar drawer and indicators for RTL locales', () => {
    expect(appHeaderMenuSource).toContain("import { getLocaleDirection } from '@/lang/direction';");
    expect(appHeaderMenuSource).toContain(":icon=\"headerMenuIcon\"");
    expect(appHeaderMenuSource).toContain("'grid-block-align-right-24'");
    expect(appHeaderMenuSource).toContain("'arrows-chevron-left-rounded-24'");
    expect(appHeaderMenuSource).toContain("html[dir='rtl'] &");
    expect(appHeaderMenuSource).toContain('left: -272px !important;');
    expect(appHeaderMenuSource).toContain('transform: translateX(264px) !important;');
    expect(appHeaderMenuSource).toContain('margin-right: auto;');
    expect(appHeaderMenuSource).toContain('margin-right: 64px;');
  });
});
