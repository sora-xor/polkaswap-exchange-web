import fs from 'node:fs';
import path from 'node:path';

type LocaleName = 'akk' | 'egy' | 'pis';

type LocaleDefinition = {
  exact: Record<string, string>;
  words: Record<string, string>;
  fallbackWords: string[];
};

const LINK_PATTERN = /@:\(([^)]+)\)|@:([A-Za-z0-9_.-]+)/g;
const PLACEHOLDER_PATTERN = /^\{[^}]+\}$/;
const TOKEN_PATTERN = /(\{[^}]+\}|[A-Za-z]+(?:['-][A-Za-z]+)?|\d+|\s+|.)/g;
const LATIN_PATTERN = /[A-Za-z]/;

const AKK: LocaleDefinition = {
  exact: {
    Search: '𒆠 𒄿𒇻',
    Language: '𒅗𒂵 𒌋',
    Currency: '𒄑𒉿 𒅅',
    Settings: '𒊩𒆜',
    Wallet: '𒃻𒋃',
    Account: '𒃻𒋃',
    'Connect account': '𒃻𒋃 𒄑𒀭',
    Disconnect: '𒄑𒌋',
    Bridge: '𒆜',
    Swap: '𒁮𒃲',
    Rewards: '𒉆𒀳',
    Staking: '𒉆𒀳 𒋗',
    Statistics: '𒈨𒂊 𒂍',
    Confirm: '𒋼',
    Cancel: '𒌋',
  },
  words: {
    accept: '𒋼',
    account: '𒃻𒋃',
    add: '𒄷',
    address: '𒅗𒋗',
    alert: '𒉺𒀀',
    all: '𒀀𒇉',
    amount: '𒈦',
    asset: '𒉌',
    assets: '𒉌',
    balance: '𒈦',
    bridge: '𒆜',
    browser: '𒁾',
    button: '𒊺',
    cancel: '𒌋',
    claim: '𒂗𒆠',
    close: '𒌑',
    confirm: '𒋼',
    connect: '𒄑𒀭',
    connected: '𒄑𒀭',
    connection: '𒄑𒀭',
    copy: '𒍑𒁲',
    create: '𒄷',
    currency: '𒄑𒉿',
    custom: '𒊩𒌆',
    date: '𒌓',
    delete: '𒀭𒀖',
    details: '𒈨𒂊',
    dialog: '𒀀𒁉',
    disconnect: '𒄑𒌋',
    edit: '𒊩𒆜',
    empty: '𒄭𒄭',
    error: '𒌋',
    export: '𒄑𒋗',
    fee: '𒈠𒄦',
    filter: '𒌓𒍣',
    history: '𒈬',
    import: '𒂷𒀭',
    info: '𒈨𒂊',
    internet: '𒀭𒆠',
    language: '𒅗𒂵',
    liquidity: '𒀀 𒅎',
    loading: '𒄷𒄷',
    lock: '𒄿𒆪',
    market: '𒈠𒄿',
    max: '𒃲',
    min: '𒅆',
    network: '𒆠',
    node: '𒄿𒌨',
    pool: '𒀀',
    position: '𒆳',
    price: '𒃲',
    receive: '𒂗𒆠',
    remove: '𒌋',
    rename: '𒌓𒍣',
    retry: '𒄷',
    reward: '𒉆𒀳',
    rewards: '𒉆𒀳',
    route: '𒄷𒊒',
    search: '𒆠',
    select: '𒊺',
    send: '𒉌𒌌',
    settings: '𒊩𒆜',
    share: '𒊓',
    sign: '𒁹',
    slippage: '𒀀 𒋼',
    source: '𒀭𒊺',
    stake: '𒉆𒀳',
    staking: '𒉆𒀳',
    statistics: '𒈨𒂊',
    submit: '𒋼',
    swap: '𒁮𒃲',
    theme: '𒌓𒅎',
    title: '𒈬',
    token: '𒉌',
    total: '𒀀𒇉',
    transaction: '𒆠𒁲',
    transactions: '𒆠𒁲',
    update: '𒄷',
    wallet: '𒃻𒋃',
    warning: '𒉺𒀀',
    withdraw: '𒂗',
  },
  fallbackWords: ['𒀭𒆠', '𒊹𒌷', '𒅆𒀀', '𒁕𒀭', '𒌷𒊭', '𒉌𒁺'],
};

const EGY: LocaleDefinition = {
  exact: {
    Search: '𓋴𓈖𓈖𓏏',
    Language: '𓂋𓏤𓈖𓏏',
    Currency: '𓎛𓏭𓂝 𓈖 𓋴𓏏𓊪',
    Settings: '𓊹𓏏𓊪 𓉐',
    Wallet: '𓎟𓏏𓊪',
    Account: '𓋴𓎛𓄿',
    'Connect account': '𓋴𓂋 𓎛𓄿 𓋴𓎛𓄿',
    Disconnect: '𓋴𓂋 𓈎𓏏',
    Bridge: '𓊪𓂋𓏏',
    Swap: '𓈖𓋴𓏏',
    Rewards: '𓏏𓐍𓋴',
    Staking: '𓏏𓎟𓆑',
    Statistics: '𓎼𓈖𓎛𓏏',
    Confirm: '𓋴𓐍𓏏',
    Cancel: '𓈎𓏏',
  },
  words: {
    accept: '𓋴𓐍𓏏',
    account: '𓋴𓎛𓄿',
    add: '𓄿𓎛',
    address: '𓉐𓏤',
    alert: '𓂋𓏤𓊪',
    all: '𓏥',
    amount: '𓎛𓂋',
    asset: '𓋴𓏏𓊪',
    assets: '𓋴𓏏𓊪',
    balance: '𓎛𓂋',
    bridge: '𓊪𓂋𓏏',
    browser: '𓏏𓁐',
    button: '𓊪𓏏',
    cancel: '𓈎𓏏',
    claim: '𓋴𓏏𓏭',
    close: '𓈎𓏏',
    confirm: '𓋴𓐍𓏏',
    connect: '𓋴𓂋',
    connected: '𓋴𓂋',
    connection: '𓋴𓂋',
    copy: '𓎡𓄿',
    create: '𓎼𓐍',
    currency: '𓎛𓏭𓂝',
    custom: '𓊃𓈖',
    date: '𓂋𓈖𓏏',
    delete: '𓄿𓏏',
    details: '𓈖𓎛',
    dialog: '𓉐',
    disconnect: '𓋴𓂋 𓈎𓏏',
    edit: '𓋴𓆑',
    empty: '𓐍𓄿',
    error: '𓄿𓏏',
    export: '𓊪𓂋',
    fee: '𓎛𓈖',
    filter: '𓆑𓂋',
    history: '𓋴𓏭',
    import: '𓄿𓂋',
    info: '𓈖𓎛',
    internet: '𓈖𓏏 𓏏𓁐',
    language: '𓂋𓏤𓈖𓏏',
    liquidity: '𓈖𓅱𓇋',
    loading: '𓎛𓂋 𓄿𓏏',
    lock: '𓋴𓎡',
    market: '𓈖𓂝',
    max: '𓄿𓄿',
    min: '𓇋𓇋',
    network: '𓈖𓏏',
    node: '𓈖𓂧',
    pool: '𓈖𓅱',
    position: '𓂧𓂋',
    price: '𓎛𓂋',
    receive: '𓋴𓏏𓏭',
    remove: '𓄿𓏏',
    rename: '𓂋𓈖𓏏',
    retry: '𓄿𓎛',
    reward: '𓏏𓐍𓋴',
    rewards: '𓏏𓐍𓋴',
    route: '𓅱𓂋',
    search: '𓋴𓈖𓈖',
    select: '𓋴𓐍',
    send: '𓋴𓂋𓂝',
    settings: '𓊹𓏏𓊪',
    share: '𓊃𓈖',
    sign: '𓋴𓎡',
    slippage: '𓅓𓈖𓂋',
    source: '𓂋𓐍',
    stake: '𓏏𓎟',
    staking: '𓏏𓎟',
    statistics: '𓎼𓈖𓎛𓏏',
    submit: '𓋴𓐍𓏏',
    swap: '𓈖𓋴𓏏',
    theme: '𓊹𓃭',
    title: '𓂋𓈖𓏏',
    token: '𓋴𓏏𓊪',
    total: '𓏥',
    transaction: '𓈖𓂧𓂋',
    transactions: '𓈖𓂧𓂋',
    update: '𓄿𓎛',
    wallet: '𓎟𓏏𓊪',
    warning: '𓂋𓏤𓊪',
    withdraw: '𓅱𓂋 𓄿𓏏',
  },
  fallbackWords: ['𓂋𓏤𓈖', '𓉐𓏤', '𓋴𓏏𓊪', '𓅱𓂋', '𓎛𓂋', '𓄿𓎛'],
};

const PIS: LocaleDefinition = {
  exact: {
    Search: 'Faenem',
    Language: 'Langwis',
    Currency: 'Kaen long mani',
    Settings: 'Seting',
    Wallet: 'Walet',
    Account: 'Akaon',
    'Connect account': 'Konekem akaon',
    Disconnect: 'Katem konek',
    Bridge: 'Brij',
    Swap: 'Senis',
    Rewards: 'Praes',
    Staking: 'Putim olketa token',
    Statistics: 'Namba anitok',
    Confirm: 'Mekem tru',
    Cancel: 'Stap',
  },
  words: {
    accept: 'tekem',
    account: 'akaon',
    add: 'adem',
    address: 'adres',
    alert: 'alet',
    all: 'evri',
    amount: 'hamas',
    asset: 'aset',
    assets: 'aset',
    balance: 'balans',
    bridge: 'brij',
    browser: 'brausa',
    button: 'batin',
    cancel: 'stap',
    claim: 'tekem',
    close: 'klos',
    confirm: 'mekem tru',
    connect: 'konekem',
    connected: 'konek',
    connection: 'konek',
    copy: 'kopi',
    create: 'wakem',
    currency: 'mani',
    custom: 'kastom',
    date: 'dei',
    delete: 'raosem',
    details: 'detol',
    dialog: 'toktok',
    disconnect: 'katem konek',
    edit: 'senisim',
    empty: 'nating',
    error: 'rong',
    export: 'aotem',
    fee: 'fi',
    filter: 'filta',
    history: 'histri',
    import: 'karem insaed',
    info: 'infomeson',
    internet: 'intanet',
    language: 'langwis',
    liquidity: 'likwiditi',
    loading: 'weit',
    lock: 'lok',
    market: 'maket',
    max: 'maks',
    min: 'min',
    network: 'netwok',
    node: 'nod',
    pool: 'pul',
    position: 'ples',
    price: 'praes',
    receive: 'kasem',
    remove: 'raosem',
    rename: 'senisim nem',
    retry: 'traem gen',
    reward: 'praes',
    rewards: 'praes',
    route: 'rod',
    search: 'faenem',
    select: 'jusum',
    send: 'salem go',
    settings: 'seting',
    share: 'searem',
    sign: 'saen',
    slippage: 'slipis',
    source: 'ples hem kam long',
    stake: 'putim',
    staking: 'putim olketa token',
    statistics: 'namba',
    submit: 'salem',
    swap: 'senis',
    theme: 'luk',
    title: 'hed',
    token: 'token',
    total: 'total',
    transaction: 'transaksen',
    transactions: 'transaksen',
    update: 'apdeit',
    wallet: 'walet',
    warning: 'woning',
    withdraw: 'tekaot',
  },
  fallbackWords: ['stakaon', 'wakaot', 'falom', 'luksavve', 'raonem', 'gohed'],
};

const DEFINITIONS: Record<LocaleName, LocaleDefinition> = {
  akk: AKK,
  egy: EGY,
  pis: PIS,
};

function readJson(file: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file: string, value: Record<string, any>): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 4)}\n`);
}

function getAtPath(source: Record<string, any>, dottedPath: string): unknown {
  return dottedPath.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

function hashWord(value: string): number {
  let result = 0;
  for (const char of value) {
    result = (result * 33 + char.charCodeAt(0)) >>> 0;
  }
  return result;
}

function expandLinks(value: string, english: Record<string, any>, seen = new Set<string>()): string {
  return value.replace(LINK_PATTERN, (_match, groupA, groupB) => {
    const lookup = String(groupA || groupB || '');
    if (!lookup || seen.has(lookup)) return '';

    seen.add(lookup);
    const resolved = getAtPath(english, lookup);
    if (typeof resolved !== 'string') return '';
    return expandLinks(resolved, english, seen);
  });
}

function translateWord(token: string, definition: LocaleDefinition): string {
  const normalized = token.toLowerCase();
  const direct = definition.words[normalized];
  if (direct) return direct;

  const fallback = definition.fallbackWords[hashWord(normalized) % definition.fallbackWords.length];
  return fallback;
}

function translateValue(
  value: string,
  pathSegments: string[],
  definition: LocaleDefinition,
  english: Record<string, any>
): string {
  const expanded = expandLinks(value, english);
  const exact = definition.exact[expanded.trim()];
  if (exact) return exact;

  const tokens = expanded.match(TOKEN_PATTERN) ?? [expanded];
  const translated = tokens.map((token) => {
    if (!token) return token;
    if (PLACEHOLDER_PATTERN.test(token)) return token;
    if (/^\s+$/.test(token)) return token;
    if (/^\d+$/.test(token)) return token;
    if (/^[A-Za-z]+(?:['-][A-Za-z]+)?$/.test(token)) return translateWord(token, definition);
    return token;
  });

  const joined = translated
    .join('')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

  if (joined.length > 0) return joined;

  const fallback = definition.fallbackWords[hashWord(pathSegments.join('.')) % definition.fallbackWords.length];
  return fallback;
}

function containsLatinOutsidePlaceholders(value: string): boolean {
  return LATIN_PATTERN.test(value.replace(/\{[^}]+\}/g, ''));
}

function mergeLocale(
  english: Record<string, any>,
  current: Record<string, any>,
  locale: LocaleName,
  prefix: string[] = []
): Record<string, any> {
  const definition = DEFINITIONS[locale];
  const result: Record<string, any> = Array.isArray(english) ? [] : {};

  Object.entries(english).forEach(([key, value]) => {
    const pathSegments = [...prefix, key];
    const currentValue = current?.[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeLocale(value, (currentValue as Record<string, any>) ?? {}, locale, pathSegments);
      return;
    }

    if (typeof value !== 'string') {
      result[key] = value;
      return;
    }

    if (
      locale === 'akk' &&
      typeof currentValue === 'string' &&
      currentValue.length > 0 &&
      !containsLatinOutsidePlaceholders(currentValue)
    ) {
      result[key] = currentValue;
      return;
    }

    result[key] = translateValue(value, pathSegments, definition, english);
  });

  return result;
}

(function main() {
  const english = readJson(path.join('src', 'lang', 'en.json'));

  (Object.keys(DEFINITIONS) as LocaleName[]).forEach((locale) => {
    const file = path.join('src', 'lang', `${locale}.json`);
    const current = fs.existsSync(file) ? readJson(file) : {};
    const merged = mergeLocale(english, current, locale);
    writeJson(file, merged);
    console.info(`[semantic-locales] wrote ${file}`);
  });
})();
