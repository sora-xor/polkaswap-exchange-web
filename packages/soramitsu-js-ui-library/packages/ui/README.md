# ui

## Usage

Styles import:

```ts
import '@soramitsu-ui/ui/styles'
```

All-in-one plugin:

```ts
import { plugin } from '@soramitsu-ui/ui'
import { createApp } from 'vue'

const app = createApp({}).use(plugin())
```

A-la-carte:

```vue
<script setup>
import { SButton } from '@soramitsu-ui/ui'
</script>

<template>
  <SButton>Click</SButton>
</template>
```

## Migration

### SMenu

SMenu components were renamed:

- `SMenu` -> `SNavigationMenu`
- `SSubmenu` -> `SNavigationSubmenu`
- `SMenuItem` -> `SNavigationMenuItem`

`router` property removed:\
There are no need for `router` as it was just call push with selected item `index`.

`index` property in `SMenuItem`(`SNavigationMenuItem`) renamed to `value`.

Toggling `SNavigationSubmenu` doesn't call `SNavigationMenu` `select` event.

### STable

There are columns sending reactive data to table with provided register function.
So creating table column prop values in template (like `:selectable="() => {}"`) causes recursive rerender,
as every render creates new value for prop which triggers another render.

Column type `index` removed and so is prop `index`.

All events now have naming: `mouse-enter:cell` or `change:expand` instead of `cell-mouse-enter` or `expand-change`

Added column type `details` removed and event `click:row-details`.

`align` in column options (like in events) now has values without `is-` prefix.

Callbacks for `headerCellStyle` and `headerCellClassName` now called without row information
and callbacks for `headerRowStyle` and `headerRowClassName` now don't have parameters at all,
because they don't have ones

Removed header filtration:

- Props: `filters`, `filterPlacement`, `filterMultiple`, `filterMethod`, `filteredValue`, `columnKey`
- Method `clearFilter`
- Event `filter-change`

Removed summary:

- Props: `showSummary`, `summaryMethod`, `sumText`

Removed tree rows:

- Props: `treeProps`, `load`, `lazy`, `indent`

Removed `property` and `showTooltipWhenOverflow` prop, which were aliases to `prop` and `showOverflowTooltip`.

Removed `renderHeader` prop (use slot instead).

Removed `resizable` prop, and so is `header-dragend` event.

Removed `stripe` and `border` props, as there are no design for them.

Removed public method `doLayout`, because resize observables should be enough.

Added adapted version of table which is a card grid without header and is used when table width is lower
than value defined by `adaptBreakpoint` prop. Number of gird columns defined by prop `cardGridBreakpoints`.
There rows are cards with label-value list. There are no sort and current row highlighting. Multiple rows selection can
be done by clicking on card.

### SPagination

There are removed props due to design restrictions: `small`, `background`, `pagerCount`, `layout`, `prevText`,
`nextText`, `disabled`, `hideOnSinglePage`, `pageCount`, `popperClass`.

Removed `size-change` and `current-change`. Use `update:currentPage` and `update:pageSize` instead.

Replaced `prev-click` and `next-click` with `click:prev` and `click:next`.
