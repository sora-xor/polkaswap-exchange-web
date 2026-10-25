# @soramitsu-ui/vite-plugin-svg

Simplified and **working** version of [vite-svg-loader](https://github.com/jpkleemans/vite-svg-loader).

This packages is created because of https://github.com/jpkleemans/vite-svg-loader/issues/54

## Install

As a regular NPM package.

## Usage

Install as Vite plugin:

```ts
// FILE: vite.config.ts

export default {
  plugins: [
    Svg({
      svgo: {}, // pass optimization options or `false` to disable
    }),
  ],
}
```

Import SVG as a Vue component:

```vue
<script setup>
import MyIcon from './my-icon.svg'
</script>

<template>
  <MyIcon />
</template>
```
