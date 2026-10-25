import { readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const distRoot = resolve(__dirname, '../dist-ts')

async function fixAliases(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      await fixAliases(entryPath)
      continue
    }
    if (!entry.name.endsWith('.d.ts')) continue

    const content = await readFile(entryPath, 'utf8')
    const updated = content.replace(/(['"])@\/([^'"\n]+)\1/g, (match, quote, targetPath) => {
      const absTarget = resolve(distRoot, targetPath)
      let relPath = relative(dirname(entryPath), absTarget).replace(/\\/g, '/')
      if (!relPath.startsWith('.')) relPath = './' + relPath
      return `${quote}${relPath}${quote}`
    })
    if (updated !== content) {
      await writeFile(entryPath, updated)
    }
  }
}

await fixAliases(distRoot)

const tableCardPath = resolve(distRoot, 'components/Table/STableCard.vue.d.ts')
const tableColumnPath = resolve(distRoot, 'components/Table/STableColumn.d.ts')

const tableCardDts = `import type { DefineComponent } from 'vue';
import type { TableActionColumnApi, TableColumnApi } from './api';
import type { TableRow } from './types';

export interface STableCardProps {
  row: { data: TableRow; index: number };
  columns?: (TableColumnApi | TableActionColumnApi)[];
  activeExpandColumn?: (TableActionColumnApi & { type: 'expand' }) | null;
  expanded?: boolean;
  selected?: boolean;
  selectable?: boolean;
}

export type STableCardEmits = {
  (event: 'select'): void;
  (event: 'expand'): void;
  (event: 'click:details'): void;
  (
    event: 'mouse-event:label',
    payload: { column: TableColumnApi | TableActionColumnApi; event: MouseEvent }
  ): void;
  (
    event: 'mouse-event:value',
    payload: { row: TableRow; column: TableColumnApi | TableActionColumnApi; event: MouseEvent }
  ): void;
};

declare const STableCard: DefineComponent<
  STableCardProps,
  {},
  {},
  {},
  {},
  {},
  {},
  STableCardEmits
>;

export default STableCard;
`

const tableColumnDts = `import type { DefineComponent } from 'vue';
import type {
  TableColumnType,
  TableColumnRowSelectableFunc,
  TableColumnCellValueFormatter,
  TableColumnAlign,
  TableColumnSortBy,
  TableColumnSortOrder,
} from './types';

declare const STableColumn: DefineComponent<{
  type?: TableColumnType;
  label?: string;
  prop?: string;
  width?: string;
  minWidth?: string;
  sortable?: boolean | 'custom';
  sortMethod?: (<T>(a: T, b: T) => number) | null;
  sortBy?: TableColumnSortBy;
  sortOrders?: TableColumnSortOrder[];
  formatter?: TableColumnCellValueFormatter | null;
  showOverflowTooltip?: boolean;
  align?: TableColumnAlign;
  headerAlign?: TableColumnAlign | null;
  className?: string;
  labelClassName?: string;
  selectable?: TableColumnRowSelectableFunc | null;
  reserveSelection?: boolean;
}>;

export default STableColumn;
`

await writeFile(tableCardPath, tableCardDts)
await writeFile(tableColumnPath, tableColumnDts)
