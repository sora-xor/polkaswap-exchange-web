# Theming and Design Tokens

The Soramitsu design system revolves around reusable **tokens** (color, spacing, typography, motion) and **typography presets** compiled in the `@soramitsu-ui/theme` package. Components in `@soramitsu-ui/ui` read from these tokens to stay visually consistent.

## Token taxonomy

Tokens are grouped by abstraction level:

- `ref` — universal references (base palette, font families, radii).
- `sys` — system-level choices derived from references (primary button background, success state colors).
- `comp` — component-specific overrides required for bespoke UI parts.

The hierarchy flows from `ref` → `sys` → `comp`. Higher layers should not depend on lower-level variables.

Token definitions live in `packages/theme/src/sass/tokens.scss`. Each entry describes the schema, which Sass utilities expand into CSS Custom Properties using the `--sora_<path>` naming pattern.

## Sass utilities

Import the Sass module and use the provided mixins/functions to bind or evaluate tokens:

```scss
@use '@soramitsu-ui/fonts/Sora';
@use '@soramitsu-ui/theme/sass' as theme;

@include theme.typography-preset-default;

:root {
  // Bind full preset values
  @include theme.tokens-preset-light;

  // Override specific values
  @include theme.eval-tokens-partial(
    (
      sys: (
        color: (
          primary: #0057b8,
        ),
      ),
    )
  );
}

.button {
  color: theme.token-as-var('sys.color.on-primary');
}
```

- `token()` returns the raw CSS variable name.
- `token-as-var()` wraps the variable in `var(...)`.
- `eval-tokens()` and `eval-tokens-partial()` assign concrete values to token paths.

Typography presets (mixins prefixed with `typography-preset-`) emit utility classes like `.sora-tpg-h1` and `.sora-tpg-body`.

## Runtime theming

Components rely on CSS variables, making runtime theme switches straightforward:

1. Include both base and dark/light overrides in your bundle.
2. Toggle a class on the root element that scopes the overrides.

```scss
:root {
  @include theme.tokens-preset-light;
}

[data-theme='dark'] {
  @include theme.tokens-preset-dark;
}
```

```ts
const toggleTheme = (isDark: boolean) => {
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
}
```

Avoid re-importing Sass at runtime; generate the CSS once during build.

## Consuming tokens in Vue components

- Prefer CSS variables over hard-coded values inside `.vue` files.
- Use `@soramitsu-ui/ui/theme` utility files when available (e.g. helpers translating token IDs to class names).
- For dynamic styles, bind inline styles to the CSS variable: `:style="{ backgroundColor: 'var(--sora_sys_color_primary)' }"`.

## JavaScript token schema

The theme package exports the token identifier list for type-safe lookups:

```ts
import { themeTokenIds, ThemeTokenId } from '@soramitsu-ui/theme'

const primaryColor: ThemeTokenId = themeTokenIds.find((id) => id.includes('primary'))
```

Use these helpers when building tooling (e.g. docs, design token browsers) to avoid typo-prone string literals.

## Windi CSS integration

Windi CSS is configured in `packages/ui/windi.config.ts` to bridge tokens with utility classes. When adding tokens that should become utility classes:

1. Extend the Windi config with new `theme.extend` entries referencing token variables.
2. Regenerate the theme build (`yarn build:theme`).
3. Validate in Storybook and Cypress to ensure utilities resolve correctly.

## Updating tokens

1. Edit the schema in `packages/theme/src/sass/tokens.scss`.
2. Adjust corresponding preset files (e.g. `tokens-preset-light.scss`).
3. Run the theme tests:
   ```sh
   yarn --cwd packages/theme test
   ```
4. Rebuild the theme:
   ```sh
   yarn build:theme
   ```
5. Document the change in [theming.md](theming.md) (this file) or link to the changelog.
6. If the change affects component visuals, update screenshots, stories, and release notes.

## Fonts

Typography mixins rely on the Sora font available via `@soramitsu-ui/fonts`. Import the font package at the application entry point or include it through your asset pipeline. Ensure `font-display: swap` is enabled to avoid blocking render.

## Icons and theme

Icon colors derive from `sys.color` tokens by default. When overriding icon themes:

- Use currentColor-friendly SVGs so they honour surrounding text color.
- Inject component-specific colors through CSS variables rather than static fills.

## Reference material

- `packages/theme/README.md` — canonical reference for Sass utilities.
- Material Design 3 token primer (https://m3.material.io/foundations/design-tokens/overview) — conceptual background.
- [components.md](components.md) — demonstrates how tokens flow into component APIs.

Document new token categories or deprecations here whenever you evolve the design system.
