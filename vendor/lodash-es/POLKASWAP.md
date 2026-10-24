# Vendored lodash-es

Vite resolves `lodash-es` to this directory. Root Yarn dependency updates do not
replace these files.

Updated to upstream `lodash-es@4.18.1` on 2026-10-24 to address
[template import code injection](https://github.com/lodash/lodash/security/advisories/GHSA-r5fr-rjxr-66jc)
and prototype traversal in `unset` / `omit`
([original issue](https://github.com/lodash/lodash/security/advisories/GHSA-xxjr-mmjv-4gpg),
[array-path bypass](https://github.com/lodash/lodash/security/advisories/GHSA-f23m-r3pf-42rh)).

The npm tarball was verified against registry integrity
`sha512-J8xewKD/Gk22OZbhpOVSwcs60zhd95ESDwezOFuA3/099925PdHJ7OFHNTGtajL3AlZkykD32HykiMo+BIBI8A==`.
The previous 4.17.21 copy contained formatting changes only; upstream changes
were applied with the repository's Prettier settings. The MIT license is retained.

`tests/unit/vendor/lodash-es.spec.ts` checks the actual Vite alias for security
regressions and ordinary nested-property/template behavior. Run it with
`yarn test:unit tests/unit/vendor/lodash-es.spec.ts` after future refreshes.
Include this package in advisory scans independently of `yarn npm audit`.
