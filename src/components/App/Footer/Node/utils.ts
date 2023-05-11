import { countryCodeEmoji } from 'country-code-emoji';

import store from '@/store';

export function formatLocation(code: string): Nullable<{ flag: string; name?: string }> {
  try {
    const isoCode = code.toUpperCase();
    const flag = countryCodeEmoji(isoCode);
    const location = { flag, name: '' };
    const displayRegions = store.state.settings.displayRegions;
    if (!displayRegions) {
      return location;
    }
    const name = displayRegions.of(isoCode);
    if (name) {
      location.name = name;
    }
    return location;
  } catch (error) {
    console.warn('Unsupported format of location in env.json', error);
    return null;
  }
}
