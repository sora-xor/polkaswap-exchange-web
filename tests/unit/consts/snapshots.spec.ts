import { describe, expect, it } from 'vitest';

import { ASSET_SUPPLY_FILTERS, NETWORK_STATS_FILTERS, SECONDS_IN_TYPE } from '@/consts/snapshots';
import { Timeframes } from '@/types/filters';

describe('snapshot filters', () => {
  it('uses daily snapshots for one-year network history so stats charts have available historical data', () => {
    const networkYearFilter = NETWORK_STATS_FILTERS.find((filter) => filter.name === Timeframes.YEAR);
    const assetSupplyYearFilter = ASSET_SUPPLY_FILTERS.find((filter) => filter.name === Timeframes.YEAR);

    if (!networkYearFilter || !assetSupplyYearFilter) {
      throw new Error('Expected one-year snapshot filters to be configured');
    }

    expect(networkYearFilter).toMatchObject({
      label: '1Y',
      type: 'DAY',
      count: 365,
    });
    expect(networkYearFilter).toEqual(assetSupplyYearFilter);
    expect(SECONDS_IN_TYPE[networkYearFilter.type]).toBe(24 * 60 * 60);
  });
});
