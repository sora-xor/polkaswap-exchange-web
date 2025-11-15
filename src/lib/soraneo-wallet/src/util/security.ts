import type { Blacklist, WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

const MAX_SYMBOL_LENGTH = 32;
const MAX_NAME_LENGTH = 128;
const MAX_ADDRESS_LENGTH = 256;
const MAX_ICON_LENGTH = 1024;
const CONTROL_CHARS_REGEXP = /[\u0000-\u001F\u007F]/g;
const FORBIDDEN_HTML_CHARS_REGEXP = /[<>]/g;
const ALLOWED_ICON_PROTOCOLS = new Set(['http:', 'https:', 'ipfs:', 'data:']);

const sanitizeText = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string') return '';

  return value.replace(CONTROL_CHARS_REGEXP, '').replace(FORBIDDEN_HTML_CHARS_REGEXP, '').trim().slice(0, maxLength);
};

const sanitizeAddress = (value: unknown): string => {
  return sanitizeText(value, MAX_ADDRESS_LENGTH);
};

const sanitizeSymbol = (value: unknown): string => {
  return sanitizeText(value, MAX_SYMBOL_LENGTH);
};

const sanitizeName = (value: unknown): string => {
  return sanitizeText(value, MAX_NAME_LENGTH);
};

const sanitizeIcon = (value: unknown): string => {
  const icon = sanitizeText(value, MAX_ICON_LENGTH);
  if (!icon) return '';

  if (icon.startsWith('/') || icon.startsWith('./') || icon.startsWith('../')) return icon;
  if (icon.startsWith('data:image/')) return icon;

  try {
    const parsed = new URL(icon, 'https://placeholder.invalid');
    return ALLOWED_ICON_PROTOCOLS.has(parsed.protocol) ? icon : '';
  } catch {
    return '';
  }
};

const sanitizeDecimals = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.trunc(value);
    return rounded >= 0 && rounded <= 30 ? rounded : null;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      const rounded = Math.trunc(parsed);
      return rounded >= 0 && rounded <= 30 ? rounded : null;
    }
  }

  return null;
};

const toPlainObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return null;

  return value as Record<string, unknown>;
};

export const sanitizeWhitelistPayload = (payload: string): WhitelistArrayItem[] => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    console.error('[whitelist] Unable to parse whitelist payload.', error);
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn('[whitelist] Payload is not an array.');
    return [];
  }

  const sanitized: WhitelistArrayItem[] = [];

  parsed.forEach((item, index) => {
    const candidate = toPlainObject(item);

    if (!candidate) {
      console.warn(`[whitelist] Skipping entry at index ${index} due to invalid structure.`);
      return;
    }

    const address = sanitizeAddress(candidate.address);
    const symbol = sanitizeSymbol(candidate.symbol);
    const name = sanitizeName(candidate.name);
    const icon = sanitizeIcon(candidate.icon);
    const decimals = sanitizeDecimals(candidate.decimals);

    if (!address || !symbol || !name || decimals === null) {
      console.warn(`[whitelist] Skipping entry at index ${index} due to missing required fields.`);
      return;
    }

    sanitized.push({ address, symbol, name, icon, decimals });
  });

  return sanitized;
};

export const sanitizeNftBlacklistPayload = (payload: string): Blacklist => {
  const trimmedPayload = typeof payload === 'string' ? payload.trim() : '';

  if (!trimmedPayload) {
    console.warn('[nft-blacklist] Payload is empty.');
    return [];
  }

  if (!trimmedPayload.startsWith('[')) {
    console.warn('[nft-blacklist] Payload is not an array.');
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmedPayload);
  } catch (error) {
    console.warn('[nft-blacklist] Unable to parse blacklist payload.', error);
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn('[nft-blacklist] Payload is not an array.');
    return [];
  }

  const sanitized: string[] = [];

  parsed.forEach((item, index) => {
    const address = sanitizeAddress(item);
    if (!address) {
      console.warn(`[nft-blacklist] Skipping entry at index ${index} due to invalid address.`);
      return;
    }

    sanitized.push(address);
  });

  return sanitized;
};
