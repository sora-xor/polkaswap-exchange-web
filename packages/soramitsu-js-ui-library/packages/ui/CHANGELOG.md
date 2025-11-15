# @soramitsu-ui/ui

## 2.0.0

### Major Changes

- Version bump only; no code changes since 0.8.0.

## 0.8.0

### Patch Changes

- Version bump only; no code changes since 0.13.15.

## 0.13.15

### Patch Changes

- be548008: **feat**(`STable`): change cursor style to pointer when hovering on a table row and handler for `click:row` event is truthy

## 0.13.14

### Patch Changes

- 418e324: **fix**(`SDatePicker`): prevent turning date picker inner button into submit

## 0.13.13

### Patch Changes

- b5029a5b: **feat**(`SSelectDropdown`): add mandatory prop

## 0.13.12

### Patch Changes

- 0a615d5c: **feat**(`STextField`): add validations list prop

## 0.13.11

### Patch Changes

- 8d0d2d66: **fix**(`SDropdown`): add expression to display dropdown options correctly

## 0.13.10

### Patch Changes

- 9e0825f8: **refactor**(`STable`,`STableCard`,`STableCellSelection`): use new defineEmits syntax

## 0.13.9

### Patch Changes

- 2a85253a: **feat**(`STable`): add generics types of provided data

## 0.13.8

### Patch Changes

- d7228159: **feat**(`SSelectDropdown`): add `maxShownOptions` prop

## 0.13.7

### Patch Changes

- 2d62a77c: **fix**(`SModalCard`): add `s-modal-card__content` class and apply windicss classes
- 75066428: **refactor**: update vue-tsc and ts and fix everything updated version breaks

## 0.13.6

### Patch Changes

- 959a106d: **fix**(`SAlert`): edit status icon computation

## 0.13.5

### Patch Changes

- aabc99e: **fix**(`SSelect`): add `search` event emit when field clears on menu closing

## 0.13.4

### Patch Changes

- 93ac3f32: **feat**(`Sbadge`): add `tabular` prop to make badge be on the same level as the column label

## 0.13.3

### Patch Changes

- 3b53610c: **fix**(`STable`): remove column width rounding
- 455459de: **fix**(`STable`): apply overflow-y:auto to the whole table

## 0.13.2

### Patch Changes

- dcb0dcb5: **fix**(`SSelect`): add menu toggling by clicking on chevron

## 0.13.1

### Patch Changes

- a339aa2: **fix**(`SSelect`): add search field clearing when popover closed

## 0.13.0

### Minor Changes

- 83678e6: **feat**(`SDatePicker`): make date filters work for time panel
- 83678e6: **feat**(`SDatePicker`): make possible to show date picker without shortcuts menu

### Patch Changes

- 83678e6: **fix**(`SDatePicker`): add value prop watching

## 0.12.0

### Minor Changes

- 0ef9fb7: **feat**(`SDatePicker`): add date disabling
- b6ba48c: **fix**(`SDatePicker`): fix disabled property reactivity
- b6ba48c: **feat**(`SDatePicker`): added support for null model value
- 8136cb5: **feat**: update vue and storybook
- b6ba48c: **feat**(`SDatePicker`): now `custom` menu option always presents as last item
- b6ba48c: **feat**(`SDatePicker`): make appropriate menu option selected on model value change
- b6ba48c: **feat**(`SDatePicker`): add null value shortcut in default shortcut list

## 0.11.0

### Minor Changes

- d9f29db: **feat**(`STable`): now `empty` slot have no wrappers with styles and added new `empty-text` slot, that works like old `empty` slot

## 0.10.1

### Patch Changes

- ba95ea0: **fix**(`SCheckbox`, `SRadio`): removed redundant hover background and change paddings
- c42b6d5: **fix**(`SDatePicker`): fix label when menu state empty

## 0.10.0

### Minor Changes

- 2591d30: **feat**(`SSelect`,`SDropdown`): add sync search in dropdown (`dropdownSearch` bool prop)
- abf0604: **feat**(`SDatePicker`): add custom trigger support
- cba3ff6: **feat**(`SSelect`): add option groups with headers and select all buttons
- 4e8d2f3: **feat**(`SSelect`,`SDropdown`): add loading state (`loading` prop)
- e3746d5: **feat**(`SDatePicker`): add support for custom shortcuts
- 0c23ddd: **feat**(`STextField`): add `prefix` slot to render inline elements before input, and `filled-state` prop to manually activate the filled state on the component when the prefix presents
- ba5fac0: **feat**(`SSelect`, `SDropdown`): introduce `empty` slot; it is forwarded to the underlying `SSelectDropdown` component
- cedf03e: **feat**(`SSelect`,`SDropdown`): add prop to select options type (`optionType` prop)
- 338204c: **feat**(`SSelect`, `SDropdown`): add `remote-search` prop that disables default search behaviour
- 596bade: **feat**(`SSelect`): add `triggerSearch` prop to enable search input in select input

### Patch Changes

- abf0604: **fix**(`SDatePicker`): add model value change on every pick
- 18b84d1: **fix**(`STable`): fix WindiCSS utility usage - replace comma with underscore (~~`grid-cols-[min-content,1fr]`~~ `grid-cols-[min-content_1fr]`). Comma caused an error when compiled styles are imported through SCSS.
- 2e374df: **fix**(`SDatePicker`): add some prop types export
- abf0604: **fix**(`SDatePicker`): add using shortcut title when selected one
- b76e303: **fix**(`STextField`): specify input font (`sora-tpg-p3`)
- feb21fb: **fix**(`SSelect`): add ellipsis on select text overflow
- bc7406b: **fix**(`SSelect`): make select options menu width same as trigger's one
- abf0604: **fix**(`SDatePicker`): fix styles

## 0.9.0

### Minor Changes

- ecd8737: **feat**: added date picker component (`SDatePicker`)
- ec199b8: **feat**(`STable`): add adaptive version of table

## 0.8.0

### Minor Changes

- a147748: **feat**(`STable`): added details table column type
- afd5e81: **feat**: add tooltip component (`STooltip`)

### Patch Changes

- 600618d: **fix**(`SSelect`): fix options font
- 90cbd2c: **fix**(`STable`): fix default sort
- a923b44: **refactor**(`STable`): change composables filenames
- 600618d: **fix**(`SSelect`): fix spacings
- d4f8683: **fix**(`SPagination`): change width to max width to prevent pages with big numbers overlapping
- 2ae0429: **refactor**(`STable`): remove warnings by replacing styles type with alias which can be recognized as Object
- bb53aa1: **refactor**(`STable`): change type names to denote the belonging to the table component
- 90cbd2c: **fix**: (`STable`): fix table rows height
- 7ba79d0: **fix**(`STable`): remove last row bottom border for easier table adjusting

## 0.7.0

### Minor Changes

- 1e62a2f: **feat**: added table components without adaptive view (`STable`, `STableColumn`)
- 0ba42c8: **feat**: add pagination component

### Patch Changes

- f6240c3: **fix**: (`SDropdown`) don't render label when it is absent, close #448
- bd58198: **fix**(`STable`): fix resize observer error throwing
- b990789: **fix**: lodash replaced to lodash-es, as it's pure
- ffb8c8d: **fix**: (`SSelectBase`) pass `z-index: 10` to the popper wrapper, fix #430
- 93fff77: **fix**: (`STextField`) fix extra attributes binding
- f004bbb: **feat**: (`SSelectBase`) auto-close menu on value selection in single mode; `no-auto-close` prop to disable it; close #447

## 0.6.1

### Patch Changes

- 4f3fdcd: **fix**: fix icon components that aren't built as Vue components, close #429
- 80856f7: **fix**: (`SAccordionItem`) workaround #433 by using handmade passive `v-model`

## 0.6.0

### Minor Changes

- c592754: **feat**: make library tree-shakeable, e.g. free from side-effects!
- 4c18cbd: **build** (BREAKING): rename build files from `lib.esm.js` & `lib.cjs.js` to `lib.mjs` & `lib.cjs` relatively.

  **Motivation**: https://v3.nuxtjs.org/guide/going-further/esm/#what-kinds-of-problems-can-there-be

  **How to migrate**: if you use direct imports of library build artifacts, you should update those imports, e.g.:

  ```ts
  // change this
  import { Status } from '@soramitsu-ui/ui/dist/lib.esm'
  import { Status } from '@soramitsu-ui/ui/dist/lib.cjs'

  // to this (no change for cjs btw)
  import { Status } from '@soramitsu-ui/ui/dist/lib.mjs'
  import { Status } from '@soramitsu-ui/ui/dist/lib.cjs'
  ```

- 65e40b8: **feat**: add Transitions component (`SCollapse`)
- 65e40b8: **feat**: add Menu components (`SNavigationMenu`, `SNavigationSubmenu`, `SNavigationMenuItem`, `SNavigationMenuItemBody`)
- c592754: **BREAKING**(`SModal`): drop opinionated usage of `body-scroll-lock`, provide an unopinionated solution.

  **What is the change:** there is a new component - `SBodyScrollLockProvider`:

  ```vue
  <script setup>
  import { SModal, SBodyScrollLockProvider, BodyScrollLockApi } from '@soramitsu-ui/ui'
  import { enableBodyScroll, disableBodyScroll } from 'body-scroll-lock'

  const lockApi: BodyScrollLockApi = {
    lock: (el) => {
      disableBodyScroll(el)
    },
    unlock: (el) => {
      enableBodyScroll(el)
    },
  }
  </script>

  <template>
    <SBodyScrollLockProvider :api="lockApi">
      <!-- Modal uses provided API -->
      <SModal />
    </SBodyScrollLockProvider>
  </template>
  ```

  `SModal` prop `lockScroll` now is just a boolean which _reactively_ controls whether it should use provided API (if there is some) or not.

  **Why the change was made:** `body-scroll-lock` has little side-effects, thus it is not fully tree-shakeable.

  **How to migrate:** if you use `SModal`, you should now use `SBodyScrollLockProvider` if you need to lock the scroll.

- c592754: **BREAKING**: change exported enums format.

  **What is the change.** Previously enums was defined as plain TypeScript enums:

  ```ts
  enum Status {
    Info = 'info',
  }
  ```

  Now we define enums as follows:

  ```ts
  const Status = {
    Info: 'info',
  } as const

  type Status = (typeof Status)[keyof typeof Status]
  ```

  **Why the change was made:** it turned out that TypeScript enums are not tree-shakeable because they are compiled into IIFE.

  **How to migrate** - you don't need to do anything except of some cases:
  - If you use some enum variant as a type, e.g.

    ```ts
    function acceptOnlyInfo(status: Status.Info) {}
    ```

    then you should add `typeof`:

    ```ts
    function acceptOnlyInfo(status: typeof Status.Info) {}
    ```

- c44463d: **refactor** (BREAKING): `STextField` - add default "model value strict synchronization" behaviour and `no-model-value-strict-sync` prop to disable it.

  Now `STextField` has a default `strict-sync` behaviour. It is useful when you need to filter `modelValue` e.g. to allow only numeric input.

  To understand why this change is made, take a look into this example:

  ```vue
  <script setup>
  const nums = ref('')

  function onInput(e) {
    const newValue = e.target.value

    if (/^\d+$/.test(newValue)) {
      nums.value = newValue
    }
  }
  </script>

  <template>
    <input :value="nums" @input="onInput" />
  </template>
  ```

  If you type `123ffa`, your `nums` will be `123`, but input value will be `123ffa`. If you need to **strictly synchronize** `<input>`'s value with `nums`, you need to add the following line at the end of `onInput`:

  ```ts
  e.target.value = nums.value
  ```

  Now `STextField` does it by default, and you can prevent it with a new prop:

  ```vue
  <template>
    <STextField no-model-value-strict-sync />
  </template>
  ```

- c592754: **BREAKING**: exclude `SJsonInput` from the library bundle

  **Why.** It has dirty dependencies (`jsoneditor`, `lodash`) which prevented the library from being side-effect-free. Anyway, `SJsonInput` seems to be unused and out of our Design System.

### Patch Changes

- c592754: **refactor**(`SModal`): use `StyleValue` type for style props (`rootStyle`, `modalStyle` etc)

## 0.5.0

### Minor Changes

- b8e7fc6: **feat**: Added ProgressBar component
- 8c4dd8f: **feat**: add Checkbox components (`SCheckboxAtom`, `SCheckboxSolo`)
- 8c4dd8f: **feat**: add Radio components (`SRadioAtom`, `SRadio`, `SRadioGroup`)
- 681200f: **feat**: Add STabsPanel and STab components.

### Patch Changes

- 1611a3a: **refactor**: use consistent `uniqueElementId` everywhere, thus generated IDs will be a bit different

## 0.4.0

### Minor Changes

- 45bd45e: **feat**: add link component
- 6dd0df4: **feat**: Added Badge component
- 49059b7: **feat**: add accordion component

### Patch Changes

- a4ee513: **fix**: STextField: fix show password in input because in form it becomes submit
- 7735926: **fix**: STextField: make root inherit classes and styles instead of input
- 5444756: **fix**: move windicss classes to styles
- cd0a8ea: **fix**: add generated windicss styles to bundle
- d5d3274: **fix**: SButton: fix style selector
- 7c74f0d: **fix**: SModal: use `object` type for `focus-trap` prop so Vue can validate it as an a boolean or object; `Options` typing is lost.
- 4cc17f2: **feat**: improve a11y of SModal & SModalCard components; `SModal` now **must** have a label, but it is automatically generated by SModal and used by SModalCard, thus no any breaking change here.
- 32a5c6f: **refactor**: use the same `nextIncrementalCounter()` utility within SAccordionItem & SModal
- d5d3274: **build**: add test id removing from production build
- e42a546: **fix**: (`STextField`) update password eye - use other icons, remove transition, fix layout

## 0.3.0

### Minor Changes

- b3108d3: **refactor**: `SModalCard`
  - Drop `width` prop - its width now can be configured just as a plain HTML element
  - Add "close" icon button and `close` prop to control it visibility
  - Update appearance, sync it with the design

- 14eead2: **feat**: add button component
- f38b3fb: **feat**: include into the plugin more components (e.g. `SSelect*` internal components)

### Patch Changes

- f38b3fb: **fix**: explicitly define component names
- 6771146: **chore**: update dependencies

## 0.2.0

### Minor Changes

- 7a43636: Add a lot of new components; update dependencies; fixes;
