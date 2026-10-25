# @soramitsu-ui/theme

This package contains the core part of Soramitsu's Design System - it's **tokens** and **typography** - and also their **presets**.

# TL;DR

Quick setup with Sass:

```scss
@use '@soramitsu-ui/fonts/Sora';
@use '@soramitsu-ui/theme/sass' as theme;

@include theme.typography-preset-default;

:root {
  @include theme.tokens-preset-light;

  // or

  @include theme.eval-tokens-partial(
    (
      sys: (
        color: (
          primary: black,
        ),
      ),
    )
  );
}

.your-button {
  color: theme.token-as-var('sys.color.primary');
}
```

```html
<!-- Use typography -->
<h1 class="sora-tpg-h1">Lorem ipsum dolor sit amet.</h1>
```

Explore/edit a set of available tokens at `src/sass/tokens.scss`.

For TypeScript consumers we also expose the token schema:

```ts
import { ThemeTokenId, themeTokenIds } from '@soramitsu-ui/theme'

const firstId: ThemeTokenId = themeTokenIds[0]
```

## Guide

Design System is based on **tokens**. The most of them are just CSS Custom Properties, but **typography** works via CSS Classes. Their approaches are different.

### Tokens-variables

Firstly, you should know the [great article about design tokens from Material](https://m3.material.io/foundations/design-tokens/overview). Our design system principles are based on it.

Tokens could be **reference** (`ref`), **system** (`sys`) of **component-specific** (`comp`). These categories have different priority, from more abstract to less abstract: `ref` > `sys` > `comp`. It's like an onion from the Domain Driven Design principles - **more abstract, core layers should not know anything about less abstract layers**. Thus, it's strongly recommended to avoid links from `ref` to `sys`, from `sys` to `comp` etc.

There are 2 main use cases for tokens:

- Bind them to the actual stylesheets
- Set their values, i.e. apply theme

For both this library provides a set of Sass utilities. With them, you can abstract from actual variables names, get verbose errors or warning in case you use wrong variable paths or something was deprecated/moved etc.

Anyway, the main dictionary of design system tokens is located at **`src/sass/tokens.scss`** in this format:

```scss
$tokens: (
  'ref': (
    'color': (
      'red': null,
      'blue': null,
    ),
  ),
  'sys': (
    'color': (
      'status-ok': null,
      'status-err': null,
    ),
  ),
  'comp': (
    'alert': (
      'background-ok': null,
      'background-err': null,
    ),
  ),
);
```

This is a pure tokens schema, without any values. If you want to add some new tokens, you should do it here in the same format.

**Bindings** could be made safely with `token` or `token-as-var` utility functions:

```scss
@use '@soramitsu-ui/theme/sass' as theme;

.alert {
  &--ok {
    background: var(theme.token('comp.alert.background-ok'));
    //  or
    background: theme.token-as-var('comp.alert.background-ok');
  }
}
```

```css
.alert--ok {
  background: var(--sora_comp_alert_background-ok);
}
```

To **bind some actual values for tokens**, use `eval-tokens` or `eval-tokens-partial` mixins:

```scss
@use '@soramitsu-ui/theme/sass' as theme;

:root {
  @include util.eval-tokens(
    (
      (
        'ref': (
          'color': (
            'red': red,
            'blue': blue,
          ),
        ),
        'sys': (
          'color': (
            'status-ok': theme.token-as-var('ref.color.blue'),
            'status-err': theme.token-as-var('ref.color.red'),
          ),
        ),
        'comp': (
          'alert': (
            'background-ok': theme.token-as-var('sys.color.status-ok'),
            'background-err': theme.token-as-var('sys.color.status-err'),
          ),
        )
      )
    )
  );

  // or partial, for specific overrides

  @include util.eval-tokens-partial(
    (
      'ref': (
        'color': (
          'red': rgb(255, 100, 100),
        ),
      ),
    )
  );
}
```

```css
:root {
  --sora_ref_color_red: red;
  --sora_ref_color_blue: blue;
  --sora_sys_color_status-ok: var(--sora_ref_color_red);
  /* ... */
}
```

This library also exports **presets** of tokens (only `light` yet). You can use it like this:

```scss
@use '@soramitsu-ui/theme/sass' as theme;

:root {
  @include theme.tokens-preset.light;
}
```

Here is an example of how to apply different themes variatively:

```scss
.app {
  &[data-dark-mode='true'] {
    @include tokens-presets.dark;
  }

  &[data-dark-mode='false'] {
    @include tokens-presets.light;
  }
}
```

### How to use these tokens at runtime, i.e. from JS?

In some cases it could be convenient to bind tokens via JS. For instance, we could make an alert component like this:

```vue
<script setup lang="ts">
import { useDesignSystemTokens } from '../ds'

const props = defineProps<{
  status: 'ok' | 'error'
}>()

const tokens = useDesignSystemTokens()

const alertBackground = computed(() => tokens.comp.alert.[`background-${prop.status}`])
</script>

<template>
  <div class="alert">Alert!</div>
</template>

<style lang="scss">
.alert {
  background: v-bind('alertBackground');
}
</style>
```

It is possible to implement, but does it worth it? Anyway, such functionality isn't needed _yet_, but it is theoretically possible to be implemented in the future.

### Typography "tokens"

With typography the problem becomes more complicated. Each typography "token" could have it's own unique set of properties, so it is more convenient to bind such "tokens" not as CSS Custom Properties, but as CSS Classes. Unfortunately, it is impossible to do it purely via CSS (we don't have native mixins yet), and anyway we have to bind classes within JS/HTML/Vue templates. Besides in case when we need to apply such "tokens" programmatically, e.g. at hover, we cannot use `::hover`, but have to implement it programmatically via JS.

Thus we cannot to use only Sass utilities which compile the actual class names, and it's better to define there classes statically. Let's use such naming convention:

- `.sora-tpg-d1`
- `.sora-tpg-d2`
- `.sora-tpg-h1`
- ...

> You can explore the full set of typography tokens in Figma.

Anyway, this library provides a bit of utilities which could help to reduce typography (possible) headacke.

**TODO**: find a way to use Windi CSS to make bindings?

To **define** actual typography classes you can use `typography` mixin that **validates the name of typography token** and **generates the actual class name** for it, so you can be more decoupled from the implementation details and to be a bit more refactoring-resistent.

```scss
@use '@soramitsu-ui/theme/sass' as theme;

@include theme.typography('d1') {
  font-family: Sora;
  font-weight: normal;
  font-size: 40px;
}

// will throw an error - unknown typography token
// @include util.typography('oh-la-la')
```

```css
.sora-tpg-d1 {
  font-family: Sora;
  font-weight: normal;
  font-size: 40px;
}
```

Finally, you can use default typography preset:

```scss
@use '~@soramitsu-ui/theme/sass' as theme;

@include theme.typography-preset-default;

// or nest it
.my-custom-typography-scope {
  @include theme.typography-preset-default;
}

// or whatever else
```

### Possible "Neumorphism" in the future

We have already established that Neumorphism could not be implemented only via tokens - there will be too much of them, and code will become too complex. Thus, apparently Neumorphism will be a global design system variation, even with its own tokens tree. Utilities like `token`, `eval-tokens`, theme presets etc will become `token-std` & `token-neumorphic` (maybe the old `token` helper will remain, but as deprecated functionality with errors/warning/redirections to `std` functionality).

### Fonts

To use Sora font, use the following entrypoint:

```scss
// From SCSS
@use '@soramitsu-ui/theme/fonts/Sora';
```

```js
// From JavaScript
import '@soramitsu-ui/theme/fonts/Sora'
```

## TODO

- [ ] Define Windi CSS preset with bindings to system/reference tokens. It will be useful primarily for library users, not for the component library itself.
