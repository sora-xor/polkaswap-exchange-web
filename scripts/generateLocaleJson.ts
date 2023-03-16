import fs from 'fs';
import { JSDOM } from 'jsdom';

// Mock browser dependencies for imported libraries
const dom = new JSDOM();
global.document = dom.window.document as any;
global.window = dom.window as any;
global.localStorage = { getItem: () => {} } as any;

function format(obj: any, formatted: any) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === 'string') {
      formatted[key] = value;
    } else {
      formatted[key] = {};
      format(value, formatted[key]);
      if (!Object.keys(formatted[key]).length) {
        delete formatted[key];
      }
    }
  }
}

(async function main() {
  const buildDir = './src/lang';
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }
  const langObj = (await import('../src/lang/messages')).default;
  const formatted = {} as any;
  format(langObj, formatted);
  fs.writeFileSync(`${buildDir}/en.json`, JSON.stringify(formatted, null, 4));
  console.info(`${buildDir}/en.json created!`);
})();
