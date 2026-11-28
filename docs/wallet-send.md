# Wallet send amounts

`WalletSend.vue` uses `getWalletSendMaxAmount` to populate **Max** from the
asset's transferable codec balance. Non-XOR assets use their full transferable
balance. XOR reserves the cached transfer fee and the shared
`SORA_NATIVE_MAX_FEE_MARGIN_CODEC` allowance from `src/consts/networkFee.ts`.
Invalid balances and unknown, nonfinite, or nonpositive XOR fees produce no
spendable maximum. All amount arithmetic uses `FPNumber`.

The SORA Nexus SDK estimates static transfer fees using a placeholder account.
The real sender's compact nonce can encode to more bytes and increase the signed
transaction's length fee. The allowance is `1000000000000` raw codec units
(0.000001 XOR at 18 decimals), covering ten length-fee bytes. Length fees are not
scaled by denomination; do not divide this allowance by the chain denominator
or redenominate the already quoted transfer fee.

Read-only production fee queries on October 26, 2026 (runtime spec 134) returned
0.100018412589707326 XOR at nonce 0 and 0.100018812589707326 XOR at nonce
1,073,741,824 for the same transfer. Subtracting only the placeholder fee leaves
the latter transfer short by 0.0000004 XOR. No transaction was signed or submitted
for this check.

The ordinary transfer fee follows wallet fee-cache updates. While editing, an
explicitly selected Max follows balance and fee changes. Manual amount edits
stop that tracking. Warning and confirmation screens preserve the reviewed
amount; returning to editing resumes Max tracking. Vested-transfer fees remain
independent of ordinary transfer fee updates.

Regression coverage lives in
`tests/unit/lib/soraneo-wallet/util/walletSendMax.spec.ts` and
`tests/unit/lib/soraneo-wallet/components/WalletSend.spec.ts`, including exact
codec-unit boundaries, large balances, signed nonce fees, late fee initialization,
manual edits, and confirmation behavior. These tests use mocked wallet calls and
make no network requests.
