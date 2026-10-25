# Bots native light and dark themes

Bots follows Polkaswap's existing theme setting. `AppShell` synchronizes the root and theme provider, which supply the native color and shadow tokens. Bots does not set its own theme or change the selected mode. The input and output token selectors remain the first content on the page.

The cyberpunk treatment comes from the accent details, motion, and raised and inset controls. Its surfaces use the application's native palette:

| Bots presentation | Native token |
| --- | --- |
| Page and raised panel surface | `--s-color-utility-surface` |
| Inset controls and chart recesses | `--s-color-base-background` |
| Main action accent | `--s-color-action-text` |
| Secondary accent and positive result text | `--s-color-status-success-text` |
| Negative research result text | `--s-color-status-error-text` |
| Shadow depth | `--s-shadow-color-dark` |
| Shadow highlight | `--s-shadow-color-light-dark` |

These semantic tokens provide the native pale light mode and plum dark mode. Shadow geometry retains its raised or inset shape when the mode changes; only the native color values change. Standalone rule controls also read these tokens directly.

## Component styling

Use native semantic tokens for new surfaces, controls, and text. Avoid adding a hardcoded dark background or a separate Bots color scheme. Keep component custom properties on the component element. In a scoped Vue stylesheet, `:global([theme]) .component` can compile to only the global ancestor and lose the descendant; this can leak variables or leave local light defaults in control. The Bots styling needs no dark selector because the application tokens already adapt.

`tests/unit/features/bot-trading/native-themes.spec.ts` compiles the actual Sass and Vue styles and checks native surface inheritance, raised/inset shadow colors, scoped custom properties, and native research result colors. The browser theme checks cover the rendered controls and the existing application theme setting.

## Theme settings popover

The shared `SPopoverPanel` retains its size observer while the same DOM element remains mounted. Observed size changes schedule one position update for the next animation frame; closing or replacing the panel cancels that update. Unchanged coordinates do not trigger another render. This avoids a WebKit resize notification loop when opening the native theme menu, without suppressing browser errors. `tests/unit/components/compat/ElPopoverCompat.spec.ts` covers deferred updates, coalescing, observer reuse, and cancellation on unmount.
