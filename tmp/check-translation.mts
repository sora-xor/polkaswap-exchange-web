import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcRoot = path.resolve(__dirname, '../src');

const langModule = await import(path.join(srcRoot, 'lang/index.ts'));
const i18n = langModule.default;
const { useTranslation } = await import(path.join(srcRoot, 'composables/useTranslation.ts'));

const result = i18n.global.t('menu.about');
console.log('direct', result, result instanceof Promise, typeof result);

const { t } = useTranslation();
const value = t('menu.about');
console.log('composable', value, value instanceof Promise, typeof value);

if (value instanceof Promise) {
  console.log('awaited', await value);
}
