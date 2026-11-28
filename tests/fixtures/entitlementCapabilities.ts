/** Explicit allowed fixtures for legacy math tests; these are not production certification. */
export const allowedLegacyCapabilities = {
  schemaVersion: 1 as const,
  mode: 'legacy' as const,
  genesisHash: `0x${'44'.repeat(32)}`,
  policyHash: null,
  statsReady: true,
  historyReady: true,
  currentViewsReady: true,
  entitlementsReady: true,
  indexedBlock: 100,
  indexedBlockHash: `0x${'55'.repeat(32)}`,
  reason: null,
};
export const allowedFullCapabilities = {
  ...allowedLegacyCapabilities,
  mode: 'full-recovery' as const,
  genesisHash: '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
  policyHash: '0x1f4e11427a9c0a61a4868af40c9e0bdf263bb44a9ee59886a537c52164f3cdbb',
  indexedBlock: 28194043,
};
