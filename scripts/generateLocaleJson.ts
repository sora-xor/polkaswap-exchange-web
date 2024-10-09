import fs from 'fs';

import { JSDOM } from 'jsdom';

// Mock browser dependencies for imported libraries
const dom = new JSDOM();
global.document = dom.window.document as any;
global.window = dom.window as any;
global.navigator = dom.window.navigator as any;
global.HTMLElement = dom.window.HTMLElement as any;
global.HTMLAnchorElement = dom.window.HTMLAnchorElement as any;
global.localStorage = { getItem: () => {} } as any;
Object.defineProperty(global.window, 'matchMedia', {
  writable: true,
  value: (arg) => ({
    matches: false,
  }),
});

function format(obj: any) {
  if (typeof obj !== 'object' || obj === null) return obj;

  const keys = Object.keys(obj);

  if (!keys.length) return null;

  const formatted = {};

  keys.forEach((key) => {
    const inner = format(obj[key]);
    if (inner) {
      formatted[key] = inner;
    }
  });

  return formatted;
}

function sortAlpha(obj: any) {
  if (typeof obj !== 'object') return obj;

  const sorted = {};

  const keys = Object.keys(obj)
    .map((k) => [k, k.toLowerCase()])
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([k]) => k);

  keys.forEach((key) => {
    sorted[key] = sortAlpha(obj[key]);
  });

  return sorted;
}

(async function main() {
  const buildDir = './src/lang';
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }
  const langObj = (await import('../src/lang/messages')).default;
  const formatted = format(langObj);
  const sorted = sortAlpha(formatted);
  fs.writeFileSync(`${buildDir}/en-compare.json`, JSON.stringify(sorted, null, 4));
  console.info(`${buildDir}/en.json created!`);
})();
