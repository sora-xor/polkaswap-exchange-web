import fs from 'fs';

import { JSDOM } from 'jsdom';

import { format, sortAlpha } from './utils';

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

(async function main() {
  const buildDir = './src/lang';
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }
  const langObj = (await import('../../src/lang/messages')).default;
  const formatted = format(langObj);
  const sorted = sortAlpha(formatted);
  fs.writeFileSync(`${buildDir}/en.json`, JSON.stringify(sorted, null, 4));
  console.info(`${buildDir}/en.json created!`);
})();
