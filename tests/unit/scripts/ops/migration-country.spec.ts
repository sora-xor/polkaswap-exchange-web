import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { loadMigrationCountryLookup, migrationCountryName } from '../../../../scripts/ops/migration-country.mjs';

const directories: string[] = [];
afterEach(() => {
  directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
});

/** Mock databases use only test-controlled range labels and never make network requests. */
function dataset(contents: string | Buffer, compressed = false) {
  const directory = mkdtempSync(join(tmpdir(), 'migration-country-test-'));
  directories.push(directory);
  const filename = join(directory, compressed ? 'country.csv.gz' : 'country.csv');
  const bytes = compressed ? gzipSync(contents) : Buffer.from(contents);
  writeFileSync(filename, bytes);
  return { filename, bytes, lookup: loadMigrationCountryLookup(filename) };
}

describe('private offline migration country lookup', () => {
  it.each([false, true])('finds inclusive IPv4 boundaries and gaps in a %s gzip dataset', (compressed) => {
    const { lookup, bytes } = dataset(
      '1.1.1.0,1.1.1.127,AU\n1.1.1.128,1.1.1.255,JP\n8.8.8.0,8.8.8.255,US\n',
      compressed
    );
    expect(lookup.metadata).toMatchObject({ ready: true, records: 3, ipv4Records: 3, ipv6Records: 0 });
    expect(lookup.metadata.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(Object.isFrozen(lookup.metadata)).toBe(true);
    for (const ip of ['1.1.1.0', '1.1.1.127']) expect(lookup(ip)).toBe('AU');
    for (const ip of ['1.1.1.128', '1.1.1.255']) expect(lookup(ip)).toBe('JP');
    for (const ip of ['8.8.8.0', '8.8.8.255']) expect(lookup(ip)).toBe('US');
    for (const ip of ['1.1.0.255', '1.1.2.0', '8.8.9.0']) expect(lookup(ip)).toBeNull();
  });

  it('accepts quoted RFC4180 fields, CRLF and UTF-8 BOM without changing literal values', () => {
    const { lookup } = dataset('\ufeff"8.8.8.0","8.8.8.255","US"\r\n');
    expect(lookup.metadata.ready).toBe(true);
    expect(lookup('8.8.8.8')).toBe('US');
  });

  it('compares full 128-bit IPv6 addresses and accepts expanded and mapped IPv4 literals', () => {
    const { lookup } = dataset(
      '8.8.8.0,8.8.8.255,US\n2001:4860:4860::1,2001:4860:4860::ffff,JP\n2606:4700::,2606:4700::ffff,AU\n'
    );
    expect(lookup.metadata).toMatchObject({ ready: true, ipv4Records: 1, ipv6Records: 2 });
    for (const ip of ['2001:4860:4860::1', '2001:4860:4860::ffff', '2001:4860:4860:0:0:0:0:ABCD'])
      expect(lookup(ip)).toBe('JP');
    expect(lookup('2001:4860:4860::')).toBeNull();
    expect(lookup('2001:4860:4860::1:0')).toBeNull();
    expect(lookup('2606:4700::')).toBe('AU');
    for (const ip of ['::ffff:8.8.8.8', '::FFFF:808:808', '0:0:0:0:0:ffff:0808:0808']) expect(lookup(ip)).toBe('US');
  });

  it('keeps vendor unknown and non-ISO XK rows unknown without discarding valid rows', () => {
    const { lookup } = dataset('1.0.0.0,1.0.0.255,ZZ\n1.0.1.0,1.0.1.255,XK\n1.0.2.0,1.0.2.255,JP\n');
    expect(lookup.metadata).toMatchObject({ ready: true, records: 3, unknownRecords: 2 });
    expect(lookup('1.0.0.10')).toBeNull();
    expect(lookup('1.0.1.10')).toBeNull();
    expect(lookup('1.0.2.10')).toBe('JP');
  });

  it('never locates non-public or special IPv4 even when the dataset labels every address', () => {
    const { lookup } = dataset('0.0.0.0,255.255.255.255,US\n');
    for (const ip of [
      '0.0.0.0',
      '0.255.255.255',
      '10.0.0.1',
      '100.64.0.0',
      '100.127.255.255',
      '127.0.0.1',
      '169.254.0.1',
      '172.16.0.0',
      '172.31.255.255',
      '192.0.0.9',
      '192.0.2.1',
      '192.31.196.1',
      '192.52.193.1',
      '192.88.99.1',
      '192.168.0.1',
      '192.175.48.1',
      '198.18.0.1',
      '198.19.255.255',
      '198.51.100.1',
      '203.0.113.1',
      '224.0.0.1',
      '239.255.255.255',
      '240.0.0.1',
      '255.255.255.255',
      '::ffff:127.0.0.1',
      '::ffff:c0a8:1',
    ])
      expect(lookup(ip), ip).toBeNull();
    for (const ip of ['1.0.0.0', '100.63.255.255', '100.128.0.0', '172.15.255.255', '172.32.0.0', '223.255.255.255'])
      expect(lookup(ip), ip).toBe('US');
  });

  it('only locates native global IPv6 and excludes protocol, transition and documentation ranges', () => {
    const { lookup } = dataset('::,ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff,US\n');
    for (const ip of [
      '::',
      '::1',
      '::8.8.8.8',
      '64:ff9b::808:808',
      '64:ff9b:1::1',
      '100::1',
      '100:0:0:1::1',
      '2001::1',
      '2001:1::1',
      '2001:2::1',
      '2001:1ff:ffff:ffff:ffff:ffff:ffff:ffff',
      '2001:db8::1',
      '2002:0808:0808::1',
      '3fff::1',
      '3fff:fff:ffff:ffff:ffff:ffff:ffff:ffff',
      '4000::1',
      '5f00::1',
      'fc00::1',
      'fd00::1',
      'fe80::1',
      'fec0::1',
      'ff02::1',
    ])
      expect(lookup(ip), ip).toBeNull();
    for (const ip of ['2001:200::1', '2001:4860:4860::8888', '2606:4700::1', '3fff:1000::1'])
      expect(lookup(ip), ip).toBe('US');
  });

  it.each([
    '',
    'not-ip',
    '8.8.8.8:80',
    '[2001:4860::1]',
    'fe80::1%en0',
    '8.8.8.8,1.1.1.1',
    ' 8.8.8.8',
    '8.8.8.8\n',
    '008.8.8.8',
    '::ffff:999.1.1.1',
    '2001:::1',
    null,
    undefined,
    808,
  ])('returns unknown for a non-canonical IP input %j', (ip) => {
    const { lookup } = dataset('0.0.0.0,255.255.255.255,US\n');
    expect(lookup(ip)).toBeNull();
  });

  it.each([
    '',
    'ip_start,ip_end,country\n',
    '8.8.8.0,8.8.8.255,USA\n',
    '8.8.8.0,8.8.8.255,AA\n',
    '8.8.8.0,8.8.8.255,us\n',
    '8.8.8.0,8.8.8.255,US,extra\n',
    '"8.8.8.0,8.8.8.255,US\n',
    '"8.8.8.0",8.8.8.255,"U""S"\n',
    '8.8.8.0,8.8.8.255,US\n\n1.1.1.0,1.1.1.255,AU\n',
    '8.8.8.255,8.8.8.0,US\n',
    '8.8.8.0,2001:4860::1,US\n',
    '8.8.8.0,8.8.8.255,US\n8.8.8.255,8.8.9.0,JP\n',
    '8.8.8.0,8.8.8.255,US\n1.1.1.0,1.1.1.255,AU\n',
    '2606:4700::1,2606:4700::ffff,US\n2606:4700::1,2606:4700::ffff,JP\n',
    '2001:4860::ffff,2001:4860::1,US\n',
    `${'x'.repeat(257)},8.8.8.8,US\n`,
  ])('fails the entire malformed dataset safely to unknown: %j', (contents) => {
    const { lookup } = dataset(contents);
    expect(lookup.metadata.ready).toBe(false);
    expect(lookup('8.8.8.8')).toBeNull();
  });

  it('returns unknown for missing configuration, absent files, directories and corrupt compressed/UTF-8 data', () => {
    expect(loadMigrationCountryLookup(undefined).metadata.reason).toBe('unconfigured');
    expect(loadMigrationCountryLookup('/missing/migration-country-test.csv').metadata.ready).toBe(false);
    const { filename } = dataset('8.8.8.0,8.8.8.255,US\n');
    expect(loadMigrationCountryLookup(join(filename, '..')).metadata.ready).toBe(false);
    for (const bytes of [Buffer.from([0x1f, 0x8b, 0x00]), Buffer.from([0xff, 0xff])]) {
      expect(dataset(bytes).lookup.metadata.ready).toBe(false);
    }
  });

  it('rejects an oversized source file before loading its bytes', () => {
    const { filename } = dataset('8.8.8.0,8.8.8.255,US\n');
    truncateSync(filename, 64 * 1024 * 1024 + 1);
    const lookup = loadMigrationCountryLookup(filename);
    expect(lookup.metadata.ready).toBe(false);
    expect(lookup('8.8.8.8')).toBeNull();
  });

  it('caps gzip expansion even when the compressed source is small', () => {
    const { lookup } = dataset(Buffer.alloc(128 * 1024 * 1024 + 1, 0x41), true);
    expect(lookup.metadata).toMatchObject({ ready: false, reason: 'invalid' });
    expect(lookup('8.8.8.8')).toBeNull();
  });

  it('names only canonical ISO country codes, without inventing names for unknown/private markers', () => {
    expect(migrationCountryName('JP')).toBe('Japan');
    expect(migrationCountryName('US')).toBe('United States');
    expect(migrationCountryName('GB')).toBe('United Kingdom');
    for (const code of ['jp', 'ZZ', 'XK', 'AA', 'UK', 'USA', '001', null, undefined])
      expect(migrationCountryName(code)).toBeNull();
  });
});
