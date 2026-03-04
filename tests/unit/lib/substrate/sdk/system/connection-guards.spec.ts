import { defaultIfEmpty, firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { SystemModule } from '@/lib/substrate/sdk/system';

describe('SystemModule connection guards', () => {
  it('returns safe defaults and inert observables when connection api is unavailable', async () => {
    const system = new SystemModule({
      connection: { api: null },
    } as any);

    expect(system.specVersion).toBe(0);
    expect(system.getChainDecimals()).toBe(0);

    await expect(firstValueFrom(system.getRuntimeVersionObservable().pipe(defaultIfEmpty(null)))).resolves.toBeNull();
    await expect(firstValueFrom(system.getBlockNumberObservable().pipe(defaultIfEmpty(-1)))).resolves.toBe(-1);
    await expect(firstValueFrom(system.getBlockHashObservable(1).pipe(defaultIfEmpty('empty')))).resolves.toBe('empty');
    await expect(firstValueFrom(system.getNetworkFeeMultiplierObservable().pipe(defaultIfEmpty(0)))).resolves.toBe(0);
    await expect(firstValueFrom(system.getEventsObservable().pipe(defaultIfEmpty([] as any)))).resolves.toEqual([]);
    await expect(system.getRuntimeVersion()).resolves.toBeNull();
  });
});
