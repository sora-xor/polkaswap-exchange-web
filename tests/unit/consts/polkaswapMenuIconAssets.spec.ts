import { describe, expect, it } from 'vitest';

const ICONS_WITH_PRODUCTION_PARITY = [
  'arrows-swap-90-24',
  'music-CD-24',
  'basic-circle-star-24',
  'basic-drop-24',
  'basic-layers-24',
  'grid-block-distribute-vertically-24',
  'finance-wallet-24',
  'call-phone-16',
  'various-items-24',
  'various-planet-24',
  'finance-PSWAP-24',
  'info-16',
  'grid-block-align-left-24',
  'basic-filterlist-24',
  'basic-eye-no-24',
  'basic-lightning-24',
  'various-brightness-low-24',
  'notifications-bell-24',
  'basic-globe-24',
  'arrows-chevron-right-rounded-24',
] as const;

const ICON_COMPONENTS = import.meta.glob('../../../src/lib/soramitsu-ui/icons/icomoon/*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

function hasIconAsset(iconName: string): boolean {
  return Object.keys(ICON_COMPONENTS).some((filePath) => filePath.endsWith(`/${iconName}.svg`));
}

describe('Polkaswap menu icon assets', () => {
  it('keeps sidebar/header icon assets present', () => {
    for (const iconName of ICONS_WITH_PRODUCTION_PARITY) {
      expect(hasIconAsset(iconName), `Missing icon asset for: ${iconName}`).toBe(true);
    }
  });
});
