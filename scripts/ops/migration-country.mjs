/** Private, offline DB-IP Country Lite lookup. Load once at relay startup; never send an IP to a provider.
 * CSV format: https://db-ip.com/db/format/ip-to-country-lite/csv.html (CC BY 4.0 attribution required).
 * This is an approximate network-country hint, not proof of residence, identity or account ownership.
 */
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs';
import { isIP } from 'node:net';
import { gunzipSync } from 'node:zlib';

const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_CSV_BYTES = 128 * 1024 * 1024;
const MAX_RECORDS = 2_000_000;
const ISO_CODES = new Set(
  (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
    'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
    'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
    'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
    'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
    'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
    'UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
  ).split(' ')
);
const COUNTRY_NAMES = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
const CSV_ROW = /^("[^"\r\n]*"|[^",\r\n]+),("[^"\r\n]*"|[^",\r\n]+),("[^"\r\n]*"|[^",\r\n]+)$/;

/** Return an English name only for a current ISO 3166-1 alpha-2 code. */
export function migrationCountryName(code) {
  return typeof code === 'string' && ISO_CODES.has(code) ? (COUNTRY_NAMES.of(code) ?? null) : null;
}

/** Parse only bare IP literals; ports, zone IDs, whitespace and forwarded lists are rejected. */
function parseIp(ip) {
  if (typeof ip !== 'string' || ip.length > 45 || !/^[\da-f:.]+$/i.test(ip)) return null;
  const family = isIP(ip);
  if (family === 4) return { family, value: ip.split('.').reduce((value, octet) => value * 256 + Number(octet), 0) };
  if (family !== 6) return null;
  let hex = ip;
  if (hex.includes('.')) {
    const colon = hex.lastIndexOf(':');
    const tail = parseIp(hex.slice(colon + 1));
    if (tail?.family !== 4) return null;
    hex = `${hex.slice(0, colon + 1)}${Math.floor(tail.value / 65536).toString(16)}:${(tail.value % 65536).toString(16)}`;
  }
  const halves = hex.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
  const words = halves.length === 1 ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  return { family, value: words.reduce((value, word) => (value << 16n) | BigInt(`0x${word}`), 0n) };
}

/** Conservative IANA special-use exclusions; false negatives are preferable to locating private addresses. */
function publicIp(ip) {
  let parsed = parseIp(ip);
  if (!parsed) return null;
  if (parsed.family === 6 && parsed.value >> 32n === 0xffffn) {
    parsed = { family: 4, value: Number(parsed.value & 0xffffffffn) };
  }
  if (parsed.family === 4) {
    const value = parsed.value;
    const excluded = [
      [0x00000000, 0x00ffffff],
      [0x0a000000, 0x0affffff],
      [0x64400000, 0x647fffff],
      [0x7f000000, 0x7fffffff],
      [0xa9fe0000, 0xa9feffff],
      [0xac100000, 0xac1fffff],
      [0xc0000000, 0xc00000ff],
      [0xc0000200, 0xc00002ff],
      [0xc01fc400, 0xc01fc4ff],
      [0xc034c100, 0xc034c1ff],
      [0xc0586300, 0xc05863ff],
      [0xc0a80000, 0xc0a8ffff],
      [0xc0af3000, 0xc0af30ff],
      [0xc6120000, 0xc613ffff],
      [0xc6336400, 0xc63364ff],
      [0xcb007100, 0xcb0071ff],
      [0xe0000000, 0xffffffff],
    ];
    return excluded.some(([start, end]) => value >= start && value <= end) ? null : parsed;
  }
  const value = parsed.value;
  if (value >> 125n !== 1n) return null; // Only 2000::/3 global unicast; excludes ULA, link-local and multicast.
  // 2001::/23 protocol assignments, 2001:db8::/32 documentation, 2002::/16 6to4, 3fff::/20 documentation.
  if (
    value >> 105n === 0x100080n ||
    value >> 96n === 0x20010db8n ||
    value >> 112n === 0x2002n ||
    value >> 108n === 0x3fff0n
  )
    return null;
  return parsed;
}

/** Read a bounded regular file through one descriptor, including a guard against growth after stat. */
function readDataset(filename) {
  const descriptor = openSync(filename, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.size < 1 || stat.size > MAX_FILE_BYTES) throw new Error('dataset');
    const bytes = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, null);
      if (!count) throw new Error('dataset');
      offset += count;
    }
    if (readSync(descriptor, Buffer.alloc(1), 0, 1, null)) throw new Error('dataset');
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

/** Attach frozen, non-sensitive readiness/provenance metadata without retaining the configured path or IPs. */
function withMetadata(lookup, metadata) {
  Object.defineProperty(lookup, 'metadata', { value: Object.freeze({ source: 'DB-IP Country Lite', ...metadata }) });
  return lookup;
}

/** Load plain CSV or CSV.gz once and return a synchronous binary-search lookup that fails to unknown.
 * Valid rows must have ordered, non-overlapping inclusive ranges in each family. DB-IP's ZZ (unknown)
 * and XK (non-ISO Kosovo code) are retained as unknown ranges instead of invalidating the entire dataset.
 */
export function loadMigrationCountryLookup(filename) {
  const unavailable = (reason) => withMetadata(() => null, { ready: false, reason, records: 0, sha256: null });
  if (typeof filename !== 'string' || !filename) return unavailable('unconfigured');
  let source;
  try {
    source = readDataset(filename);
  } catch {
    return unavailable('unavailable');
  }
  try {
    const decoded =
      source[0] === 0x1f && source[1] === 0x8b ? gunzipSync(source, { maxOutputLength: MAX_CSV_BYTES }) : source;
    if (decoded.length > MAX_CSV_BYTES) throw new Error('dataset');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(decoded);
    const families = { 4: [], 6: [] };
    let records = 0;
    let unknownRecords = 0;
    for (const line of text.trimEnd().split('\n')) {
      const row = line.endsWith('\r') ? line.slice(0, -1) : line;
      if (row.length > 256) throw new Error('dataset');
      const match = CSV_ROW.exec(row);
      if (!match || ++records > MAX_RECORDS) throw new Error('dataset');
      const [first, last, code] = match.slice(1).map((field) => (field.startsWith('"') ? field.slice(1, -1) : field));
      const start = parseIp(first);
      const end = parseIp(last);
      if (!start || !end || start.family !== end.family || start.value > end.value) throw new Error('dataset');
      if (!ISO_CODES.has(code) && code !== 'ZZ' && code !== 'XK') throw new Error('dataset');
      const country = ISO_CODES.has(code) ? code : null;
      const ranges = families[start.family];
      if (ranges.length && start.value <= ranges[ranges.length - 1].end) throw new Error('dataset');
      ranges.push({ start: start.value, end: end.value, country });
      if (!country) unknownRecords++;
    }
    if (!records) throw new Error('dataset');
    const lookup = (ip) => {
      const parsed = publicIp(ip);
      if (!parsed) return null;
      const ranges = families[parsed.family];
      let low = 0;
      let high = ranges.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const range = ranges[mid];
        if (parsed.value < range.start) high = mid - 1;
        else if (parsed.value > range.end) low = mid + 1;
        else return range.country;
      }
      return null;
    };
    return withMetadata(lookup, {
      ready: true,
      reason: 'ready',
      records,
      unknownRecords,
      ipv4Records: families[4].length,
      ipv6Records: families[6].length,
      sha256: createHash('sha256').update(source).digest('hex'),
    });
  } catch {
    return unavailable('invalid');
  }
}
