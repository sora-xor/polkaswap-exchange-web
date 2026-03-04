import { describe, expect, it } from 'vitest';

import {
  normalizePrefix,
  parseArgs,
  shouldServeHealth,
  toBooleanFlag,
} from '../../../../scripts/testing/ipfs-preview-config.mjs';

describe('ipfs-preview-config', () => {
  describe('parseArgs', () => {
    it('parses equals and space-separated flags', () => {
      const args = parseArgs(['--host=127.0.0.1', '--port', '4173', '--prefix', '/ipfs/demo', '--watch']);

      expect(args).toEqual({
        host: '127.0.0.1',
        port: '4173',
        prefix: '/ipfs/demo',
        watch: true,
      });
    });

    it('keeps empty string values passed as a positional flag argument', () => {
      const args = parseArgs(['--prefix', '']);

      expect(args.prefix).toBe('');
    });

    it('applies last-write wins for repeated flags', () => {
      const args = parseArgs(['--port', '4173', '--port=41733']);

      expect(args.port).toBe('41733');
    });
  });

  describe('normalizePrefix', () => {
    it('uses default prefix for undefined values', () => {
      expect(normalizePrefix(undefined)).toBe('/ipfs/polkaswap-e2e/');
    });

    it('normalizes root prefix for empty values', () => {
      expect(normalizePrefix('')).toBe('/');
      expect(normalizePrefix(true)).toBe('/');
    });

    it('normalizes relative and untrimmed prefixes', () => {
      expect(normalizePrefix('  ipfs/my-app  ')).toBe('/ipfs/my-app/');
    });
  });

  describe('toBooleanFlag', () => {
    it('resolves common truthy and falsy values', () => {
      expect(toBooleanFlag(true)).toBe(true);
      expect(toBooleanFlag(false)).toBe(false);
      expect(toBooleanFlag('1')).toBe(true);
      expect(toBooleanFlag('true')).toBe(true);
      expect(toBooleanFlag('on')).toBe(true);
      expect(toBooleanFlag('0')).toBe(false);
      expect(toBooleanFlag('false')).toBe(false);
      expect(toBooleanFlag('off')).toBe(false);
    });

    it('uses fallback for empty or unknown values', () => {
      expect(toBooleanFlag(undefined, true)).toBe(true);
      expect(toBooleanFlag('', true)).toBe(true);
      expect(toBooleanFlag('maybe', false)).toBe(false);
      expect(toBooleanFlag('maybe', true)).toBe(true);
    });
  });

  describe('shouldServeHealth', () => {
    it('always exposes /healthz as health endpoint', () => {
      expect(shouldServeHealth('/healthz', '/')).toBe(true);
      expect(shouldServeHealth('/healthz', '/ipfs/demo/')).toBe(true);
    });

    it('serves / as health endpoint only when running under non-root prefixes', () => {
      expect(shouldServeHealth('/', '/ipfs/demo/')).toBe(true);
      expect(shouldServeHealth('', '/ipfs/demo/')).toBe(true);
      expect(shouldServeHealth('/', '/')).toBe(false);
    });
  });
});
