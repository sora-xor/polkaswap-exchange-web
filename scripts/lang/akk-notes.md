Notes for Akkadian (Cuneiform) Locale

Scope: staking (validators, nominators, unstaking) and vaults (borrowing, debt, collateral, interest, penalties). Terms are mapped to attested Akkadian lemmata where possible. Links reference the AssyrianLanguages.org Akkadian dictionary (public web resource).

Core mappings

- Validator → dayyānu (judge)
  - Source: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=893&language=id

- Commission/fee (staking validator commission) → miksu
  - Source: “miksu … a tax; a duty” https://www.assyrianlanguages.org/akkadian/dosearch.php (search “tax”, entry 8 “miksu”)

- Nominator / to nominate (elect) → bêru (1) “to choose, select, elect”; selected → nasqu; to choose → amāru/nasāqu
  - Sources:
    - bêru (1): https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=10218&language=id
    - amāru (1) (includes “to choose, select”): https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=85&language=id
    - nasāqu / nasqu (chosen/elite): https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=10174&language=id

- Stake / pledge / collateral → maškānu (pledge, guarantee); deposit/pledge → izibtu
  - Sources:
    - maškānu: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=8214&language=id
    - izibtu: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=9689&language=id

- Unstake (withdraw pledge) → nasāḫu (to remove, take away; withdraw); also pašāru (to release/free) in certain contexts
  - Source: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=1343&language=id

- Borrow / take as loan → ana pūḫi našû
  - Source: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=6117&language=id

- Repay/pay off → eṭāru (D; to pay in full, pay off a debt)
  - Source: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=6116&language=id

- Debt → ḫabullu / ḫibiltu
  - Source: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=1967&language=id

- Interest (on a loan) → ṣibtu
  - Source: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=881&language=id

- Penalty (liquidation penalty) → šipṭu
  - Source: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=11082&language=id

- Reward (staking reward) → gimillu (requital/favor); alt. dumqu (good deed, well-being)
  - Sources:
    - gimillu: https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=7224&language=id
    - dumqu (as component in “gimil dumqāti”): https://www.assyrianlanguages.org/akkadian/dosearch.php?searchkey=783&language=id

Notes

- Grammar and inflection are kept minimal to avoid overcommitting beyond dictionary citation, given UI brevity and context. Where a precise agent noun (e.g., “elector”) is not listed, we use the core verb lexeme (bêru/amāru) or related adjective (nasqu ‘chosen’) for labels.
- For “unstaking period”, we use a descriptive compound “nasāḫu ūmū” (withdrawal days). If desired, we can refine with a vetted term for “duration/period” (e.g., muddatu) in a future pass.
- Where cuneiform signs were previously used as poetic stand-ins, we preserved them if they aid scannability; critical finance/legal semantics now rely on the transliterated lemmata above.

Examples (usage snippets)

- dayyānu (judge / validator)
  - “dayyānū dīnam iprusū” — judges decide the case (validators decide)
- miksu (tax/fee/commission)
  - “miksu ša dayyānī” — commission of the judges (validator fee)
- bêru / amāru / nasqu (choose/select/elect; chosen)
  - “bêru dayyānū” — choose validators
  - “nasqu dayyānū” — selected validators
- maškānu (pledge/collateral; by extension ‘stake’)
  - “ana maškānūti ṣabātu” — to stake (to take to pledges)
- nasāḫu (withdraw/remove; unstake)
  - “maškānu nasāḫu” — withdraw stake
- ana pūḫi našû (to borrow)
  - “ana pūḫi našû kaspam” — borrow silver
- eṭāru (to pay in full/pay off)
  - “ḫabulla eṭāru” — repay the debt
- ḫabullu (debt)
  - “ḫabullu ša kaspi” — debt of silver
- ṣibtu (interest)
  - “ṣibtu ša ḫabulli” — interest on the debt
- šipṭu (penalty)
  - “šipṭu ša nasāḫi” — penalty for withdrawal (contextual)
- gimillu (reward)
  - “gimillu {VAL}” — reward in VAL

Longer staking phrasing (UI inspiration)

- Unstaking period notice
  - “nasāḫu maškānūti: 7 ūmū; ina qāti nēse”
    - Unstake has a 7-day period; withdraw manually.
- Pending rewards cadence
  - “gimillu ša dayyānī ina 2–5 ūmū ittanaddinū; ina qāti taškun gimilla (miksu uššakkan)”
    - Validators pay out rewards every 2–5 days; you can claim them (fee applies).
- Filter by identity
  - “šumū kīnu ina paṭri” — on-chain identity present.
- Selecting validators
  - “bêru dayyānū nasqu” — choose the selected validators.
