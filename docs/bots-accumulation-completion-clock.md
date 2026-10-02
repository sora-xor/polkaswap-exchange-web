# Post-computation quote clocks

`assessAccumulationAdmissionCompletion(result)` accepts only a same-process result owned by the admission-result validator. It captures the actual parent wall and monotonic clocks. Call it after the evaluator completes and again immediately before freezing or committing any research order. It performs no transaction, acquisition or policy call.

Durable writes consume the same lifetime. Recheck after result/order persistence completes and before any attempt commit; a timestamp captured before a worker call or fsync does not cover the time that operation took. Preserve the original selection cutoff separately from the actual freeze and durable-completion clocks.

The original model-input cutoff, context receipt, selected quote receipt, fee receipt, acceptance expiry and goal deadline remain unchanged. A later fee or evaluator result never renews a quote. The five-second context/quote limits and acceptance/deadline cutoffs are exclusive; the 60-second native-block age is inclusive. Crossing into another completed hour rejects use of the older forecast, even when a quote is still young.

Effective check time is at least actual wall time and the invocation's start/completion wall times advanced by elapsed monotonic time, rounded up to milliseconds. A backward wall jump or regressing monotonic clock cannot make an expired result usable. The wall and monotonic clocks must come from the same trusted parent process as the original subprocess receipt; serialized clock claims alone are not provenance.

An expired buy stays an evaluated buy with its original selected size and a list of expiry reasons. It becomes `unusable-buy`, never an invented policy wait, free cancellation after submission, or paid failure. A real wait remains `no-buy`. A successful check returns `fresh-research-buy` but keeps `orderAuthority`, `qualificationAuthority`, `sourceAcquisitionVerified` and `journalStillCurrentVerified` false. The owner must separately prove source/coverage, exact base/start/current journal identity, frozen order semantics and execution eligibility.

This entry point is for observed current-time invocations. It cannot authorize a historical modeled result by replacing actual completion with a historical timestamp. The explicitly named `ForTesting` entry point accepts invented clocks for deterministic boundary tests and is never selected by request JSON.
