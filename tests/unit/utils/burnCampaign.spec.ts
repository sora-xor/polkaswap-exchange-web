import { describe, expect, it } from 'vitest';

import { getCampaignMsLeft } from '@/utils/burnCampaign';

describe('getCampaignMsLeft', () => {
  it('uses block-based countdown when block number is available', () => {
    const msLeft = getCampaignMsLeft(1_000, 900, 0, { blockDuration: 6_000, now: 0 });

    expect(msLeft).toBe(600_000);
  });

  it('falls back to timestamp-based countdown when block number is unavailable', () => {
    const now = 1_700_000_000_000;
    const toTimestamp = now + 120_000;
    const msLeft = getCampaignMsLeft(1_000, 0, toTimestamp, { now, blockDuration: 6_000 });

    expect(msLeft).toBe(120_000);
  });

  it('returns a negative/expired value when the fallback timestamp is in the past', () => {
    const now = 1_700_000_000_000;
    const msLeft = getCampaignMsLeft(1_000, 0, now - 1, { now });

    expect(msLeft).toBeLessThan(0);
  });
});
