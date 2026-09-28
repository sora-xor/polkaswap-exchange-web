# Community Store UI review — 25 September 2026

The storefront shows a fixed **1.759225 XOR per 100 g bag**. It has no public fiat conversion explanation or automatic merchandise repricing. The product photographs, source-on-demand description, parcel-weight quantity limits, refund states, and private receipt recovery were reviewed against the current desktop and mobile screenshots.

The merchant identity in the shipped public configuration must remain `polkaswap-community-store`, matching the relay. A regression test checks this configuration directly, without loading a sibling checkout.

Operator identity resolved: the user confirmed **Community Volunteers** as operator and owner of packing, shipping and refunds. Configuration and public disclosures must reflect that confirmed name. Public support is the [@sora_xor Telegram group](https://t.me/sora_xor), as confirmed by the user; no personal email or Telegram account is displayed. Dispatch timing remains an inquiry to support, without an invented lead time.

Privacy retention disclosures must distinguish relay records from copies in volunteer notification inboxes and backups. Customs disclosures must not promise a duty or tax calculation that checkout does not provide. These are operator configuration responsibilities; the UI renders the configured policies as text.
