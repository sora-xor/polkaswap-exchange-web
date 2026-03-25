import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DisplayRegions = Intl.DisplayNames | null;

const settingsStore = {
  displayRegions: {
    of: vi.fn((code: string) => (code === 'AE' ? 'United Arab Emirates' : undefined)),
  } as unknown as DisplayRegions,
};

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStore,
}));

describe('formatLocation', () => {
  beforeEach(() => {
    settingsStore.displayRegions = {
      of: vi.fn((code: string) => (code === 'AE' ? 'United Arab Emirates' : undefined)),
    } as unknown as DisplayRegions;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats a country code using the settings display regions', async () => {
    const { formatLocation } = await import('@/components/App/Settings/Node/utils');

    expect(formatLocation('ae')).toEqual({
      flag: '🇦🇪',
      name: 'United Arab Emirates',
    });
  });

  it('returns only the emoji when display regions are unavailable', async () => {
    settingsStore.displayRegions = null;
    const { formatLocation } = await import('@/components/App/Settings/Node/utils');

    expect(formatLocation('jp')).toEqual({
      flag: '🇯🇵',
      name: '',
    });
  });

  it('returns null for invalid codes', async () => {
    const { formatLocation } = await import('@/components/App/Settings/Node/utils');

    expect(formatLocation('???')).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });
});
