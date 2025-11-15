let piniaSyncDepth = 0;
let legacySyncDepth = 0;

export const enterPiniaSync = (): void => {
  piniaSyncDepth += 1;
};

export const leavePiniaSync = (): void => {
  piniaSyncDepth = Math.max(0, piniaSyncDepth - 1);
};

export const enterLegacySync = (): void => {
  legacySyncDepth += 1;
};

export const leaveLegacySync = (): void => {
  legacySyncDepth = Math.max(0, legacySyncDepth - 1);
};

export const isPiniaSyncing = (): boolean => piniaSyncDepth > 0;
export const isLegacySyncing = (): boolean => legacySyncDepth > 0;
