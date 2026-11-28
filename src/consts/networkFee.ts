/**
 * Reserve ten transaction-length fee bytes above placeholder-account estimates.
 * SORA Nexus charges these bytes in raw XOR codec units, without denomination scaling.
 */
export const SORA_NATIVE_MAX_FEE_MARGIN_CODEC = '1000000000000';
