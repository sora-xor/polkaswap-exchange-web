import { countryCodeEmoji } from 'country-code-emoji';

import store from '@/store';

export function formatLocation(code: string): string {
  try {
    const isoCode = code.toUpperCase();
    const flag = countryCodeEmoji(isoCode);
    const displayRegions = store.state.settings.displayRegions;
    if (!displayRegions) {
      return flag;
    }
    const name = displayRegions.of(isoCode);
    return name ? `${name} ${flag}` : flag;
  } catch (error) {
    console.warn('Unsupported format of location in env.json', error);
    return '';
  }
}
