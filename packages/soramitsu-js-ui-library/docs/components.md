# Components

This guide explains how to consume, configure, and extend the Vue components provided by `@soramitsu-ui/ui`.

## Import patterns

### Global plugin

The simplest way to register every component is through the bundled plugin. It installs components, composables, and global styles.

```ts
import { createApp } from 'vue'
import { plugin as SoramitsuUI } from '@soramitsu-ui/ui'
import '@soramitsu-ui/ui/styles'

createApp(App).use(SoramitsuUI()).mount('#app')
```

Use this approach when you control the entire application shell and can tolerate the additional bundle size.

### A-la-carte imports

For micro-frontends or performance-sensitive builds, import only the pieces you need.

```vue
<script setup lang="ts">
import { SButton, SAlert } from '@soramitsu-ui/ui'
</script>

<template>
  <SAlert type="info">
    <SButton appearance="secondary">Retry</SButton>
  </SAlert>
</template>
```

Tree shaking relies on ES module imports. Keep bundlers configured for ESM (`moduleResolution: "bundler"` in TypeScript, Vite build in ESM mode).

### Styles

All components share a single CSS bundle emitted as `@soramitsu-ui/ui/styles`. Import it once at the top of your project or in the plugin entry point. The CSS bundle injects CSS variables and resets sourced from `@soramitsu-ui/theme` tokens.

## Component catalogue

| Category   | Components                                                                             |
| ---------- | -------------------------------------------------------------------------------------- |
| Inputs     | `SCheckbox`, `SRadio`, `SSwitch`, `SSelect`, `STextField`, `SDatePicker`, `SJsonInput` |
| Navigation | `SNavigationMenu`, `SNavigationSubmenu`, `SNavigationMenuItem`, `STabs`, `SLink`       |
| Feedback   | `SAlert`, `SBadge`, `SProgressBar`, `SSpinner`, `SNotifications`, `SToasts`            |
| Surfaces   | `SAccordion`, `SModal`, `SPopover`, `STable`, `SCard`-style layouts (table adapt mode) |
| Utilities  | `SBodyScrollLockProvider`, `STooltip`, transition wrappers in `Transitions/`           |

Storybook documents the full API surface with live examples. Use `yarn sb:serve` and navigate through component categories.

## API conventions

- **Props are typed via TypeScript interfaces** (`types.ts` per component). Keep props flat and serialisable; prefer objects for complex configuration.
- **Events follow the `action:noun` pattern** (`click:row`, `update:modelValue`, `change:expand`). Avoid hyphenated legacy names when adding new events.
- **Slots mirror the DOM structure** (e.g. `header`, `row`, `details`, `prefix`). When adding slots, document default renderers in the Storybook stories.
- **Class names use BEM with underscores** (`button__icon_size_small`). Reuse existing modifiers before adding new ones.
- **Accessibility first.** Components ship with ARIA attributes, focus management, and keyboard interactions. When editing them:
  - Preserve tab order.
  - Keep `aria-*` attributes in sync with state.
  - Cover focus-trap behaviour in Cypress tests when toggling modals, popovers, and dropdowns.

## Provide/inject contracts

Complex components such as Checkbox groups, Navigation menus, and Tabs provide a context via `provide/inject`. Shared contracts live in `api.ts` inside the component directory. When extending APIs:

1. Update the provided context type and default object.
2. Consume the context via a dedicated composable (e.g. `useCheckboxGroupApi`).
3. Document required provider usage in Storybook and this guide.

## Data attributes for testing

Cypress component tests target `data-testid` attributes. Keep them stable and descriptive:

```vue
<button data-testid="s-checkbox__control"> ... </button>
```

If you rename a `data-testid`, update the corresponding spec under `packages/ui/cypress/component/`.

## Writing a new component

1. **Scaffold the directory** under `packages/ui/src/components/<Name>` and create an `S<Name>.vue` file.
2. **Export it** from `index.ts` inside the component folder, then surface it through `packages/ui/src/components/index.ts` and `all-components.ts`.
3. **Author a Storybook story** in `packages/ui/stories/components/<Name>.stories.ts` to showcase common states, edge cases, and accessibility usage.
4. **Write Cypress component tests** under `packages/ui/cypress/component/<Name>.spec.cy.ts`. Focus on keyboard interaction, focus traps, and visual state toggles.
5. **Add unit tests** for complex utilities or composables in the component folder (`*.spec.ts`).
6. **Lint and type-check** using `yarn lint:check` and `yarn --cwd packages/ui typecheck`.
7. **Update API Extractor output** by running `yarn --cwd packages/ui build:tsc` followed by `yarn --cwd packages/ui api:extract:local`.

## Composables and utilities

`packages/ui/src/composables` and `packages/ui/src/util` host sharable logic such as:

- `useClickOutside`
- `useTrapFocus`
- `useDimensions`
- Date and formatting helpers

When adding new composables:

- Prefix the file with `use`.
- Export both the named composable and the inferred return type.
- Cover tricky logic with Vitest specs (`packages/ui/src/composables/__tests__`).
- Document their intended use in component stories when they alter behaviour.

## Icons

The `icons` directory under the UI components is reserved for icon wrappers. Most implementations delegate to the `@soramitsu-ui/icons` package. When adding icons:

- Add the SVG to `packages/icons` (if it does not exist yet).
- Create a Vue wrapper in `packages/ui/src/components/icons` for consistent sizing and loading.
- Update `packages/ui/src/components/icons/index.ts` to export new icons.

## Accessibility checklist

Before shipping a component change:

- Verify keyboard navigation paths in Storybook.
- Run Cypress specs with `yarn --cwd packages/ui cy:ci:component` (CI uses the same command).
- Use `cypress-axe` or browser plugins to scan for WAI-ARIA violations.
- Document accessible usage in the corresponding story (e.g. labelling inputs, describing popovers).

## Integration tips

- Keep consumer apps aligned with the same Vue version as listed in `packages/ui/package.json` (`^3.5.21`).
- When using `pinia` or other peer dependencies in stories, import them inside Storybook preview files to avoid leaking peers into the component bundle.
- For SSR projects, import CSS in the entry server file and avoid DOM-only APIs in component setup (gate them behind `if (process.client)` checks or use `onMounted`).

Refer back to this guide whenever you introduce API changes to maintain consistency across the library.
