# Navigation artwork

`bots.svg` and `store.svg` are paired 24 × 24 monochrome icons: a cylindrical
industrial droid and a structured handbag bearing the SORA mark. The droid uses
a tapered crown, offset sensor lenses, vents, and a stepped mechanical collar.
Its 1.6-unit outline leaves room for distinct details at the 28px sidebar size. The
handbag uses rounded shoulders, a rolled handle, side piping, and a zipper pull.
Its outline uses 1.8-unit strokes; both icons' secondary details use lighter
1.2-unit strokes.

The Store badge uses the two visible `.st10` paths from `../networks/sora.svg`
without changing their geometry. Only their scale and fill are adapted for the
monochrome mask; keep the logo's cutouts clear when resizing it.

Import these assets with `?url&no-inline` and pass them as `iconSrc` to
`SidebarItemContent`. Its CSS mask supplies the existing light/dark, hover, and
active colors and hides the artwork from screen readers while keeping the
adjacent translated label. External asset URLs also work with the production CSP
and Vite's relative IPFS asset paths.
