# Bots budget and order sizing correction

The simple flow treated the total spendable budget as the draft's order amount
and fee-quote notional. An assistant could return a smaller amount, but the local
search varied signals or cadence while leaving size fixed. That conflated the
user's total allocation with an individual order and did not optimize sizing.

The total allocation now stays separate from a partial reference fee sample.
Desktop, API and Jev research receive explicit exact input-token base units for
total capital, spendable capital and the fee sample. The sample is not an order
instruction. Shared validation excludes unrelated fields, accessors and invalid
budgets. API research also receives and enforces the same cadence bounds as the
desktop path; Jev only offers locally defined recipes inside those bounds.

Training compares up to three progressively smaller exact order sizes. It
excludes the full opening spendable allocation, rounds down at token precision
and removes zero or duplicate sizes. For example, an assistant suggestion of
10 KUSD against a 10 KUSD budget produces 5, 2.5 and 1.25 KUSD research candidates;
none is a live order merely because it was generated. Every candidate obtains
its own verified fee quote. Selection uses portfolio return after costs and
drawdown in the chosen output token. The selected size and fee observation are
frozen before a single evaluation on the untouched validation partition.

The total capital, protected fee reserve, loss threshold and qualification gates
are unchanged. The returned live definition begins with original capital only,
uses the selected smaller per-order limit and cannot access unrelated wallet
balances. Existing saved bots and advanced lab settings are unchanged.

The form labels the input **Trading budget**. Review shows the total budget and
**Maximum input per swap** separately before collapsed details, using existing
translations. GO still initiates research; wallet authorization remains separate.

Regression coverage includes exact 18-decimal amounts, excluded whole-budget
orders, a smaller candidate winning with its own fees, frozen winning-fee expiry,
cancellation, desktop/provider context parity, Jev cadence filtering, preserved
10 KUSD capital and visible 2 KUSD order limits. Fixture market results establish
implementation behavior, not profitability on the live market.

Release evidence is in `output/go-history/deploy-order-sizing/`. This correction
does not establish a successful live trade or profit, and no financial limits
were raised to obtain a passing result.

## Verification and deployment

The complete unit run passed 885 application files / 6,129 tests and 25 script
files / 299 tests. The final six focused sizing/provider/UI suites passed 223
tests, including two cases added while the complete run was already underway.
All 13 translation tests, 20 Chromium/WebKit flow checks and changed-module
ESLint checks passed. Independent review found no remaining amount/fee binding
or validation-isolation defects.

Production root: `bafybeiano2k6al2ryeftg5uwtdprpjqpoisu56euexbxqhlmu7elsuhcbq`. Production and testnet
DAGs were replicated and recursively pinned at MOF. Origin and live root, entry
JavaScript, CSS and route chunks match the frozen build byte-for-byte. Bunny
confirmed the origin save and full cache purge. Official WebKit verification
passed; separate real-page checks reached Swap and Bots on desktop and Bots at
320px with zero failed requests, HTTP errors, page errors or console errors.

The wallet-connected Chrome request was also verified: its total and spendable
budget were exactly 10 KUSD, while the separately labelled fee sample was
1 KUSD. Instructions required a reusable smaller order and net portfolio growth
in XOR. The unsigned request was cancelled after inspection; 10 KUSD and XOR
remain selected. No strategy, wallet unlock, trading approval or transaction was
submitted during this verification. See `chrome-verification.json`.
