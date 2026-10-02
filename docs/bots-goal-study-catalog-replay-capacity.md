# Catalog bundle replay read allowance

`calculateGoalStudyCatalogReplayReadAllowance` is pre-acquisition size accounting
for the fixed V3 catalog verifier. It does not authenticate metadata or grant
selection or trading authority. Its caller first binds the supplied raw inventory,
collector protocol and small group completion records to the verified collection.

Pass the two ordered protocol ranges as `{id, firstHeight, lastHeight}`, the
original raw manifest's `{name, bytes}` entries, the actual ordered group
memberships as `{name, indices}`, and exact byte lengths of `run-protocol`,
`verification` and `raw-manifest`. Group records are selected with
`^group-\d{5}\.complete$`; strip only `.complete` to form the group name. Do not
infer resumed group membership from a fixed batch width. The helper verifies
complete contiguous shard coverage, each actual group size up to 32, every group
completion/member shard/batch file, sequential batch suffixes, and no unconsumed
or duplicate inventory entry. It reads no artifact bodies or network data itself.

Relative to one copy of every original metadata file, additional logical reads are:

```
bootstrap = runProtocol + rawManifest + firstTrainingShard
secondPartitionCommon = runProtocol + verification + rawManifest
sharedGroups = sum(group.complete + all member shards + all original batch files)
additionalReadBytes = bootstrap + secondPartitionCommon + sharedGroups
```

Only groups whose actual members touch both training and validation enter the
last sum. Every file in such a group is independently verified by both partition
verifiers, including member shards outside the selected partition. First-training
shard bootstrap is additional even when that shard belongs to a shared group.
The selectors are `shard-NNNNN.complete`, `group-NNNNN.complete` and all
`group-NNNNN.batch-NNNNN` files for that group's actual members and batch sequence.

The caller supplies the returned allowance to
`calculateGoalStudyExportCapacity({ ..., additionalReplayReadBytes })`. The
existing physical export reservations already count each metadata file once.
Deducting this extra logical-read allowance before dividing the raw episode
budget conservatively protects both the exporter's and the reader's existing
8 GiB ceilings. It does not raise either limit or change economic rules.

The fixed study composition reads protocol, certificate, registration, selection,
study claim and validation claim once each, and each episode's access/completion
records once. It opens each episode once; the study reader charges that episode's
entire declared raw-byte total once, and the child reader permits each artifact
once. Index/episode manifest reads are not added to the study reader's counter,
but are already conservatively reserved by export accounting. Training and
validation partition block files are each read once through metadata verification.
The generic reader still charges arbitrary repeated root/metadata reads; this
allowance describes the fixed verifier's bounded schedule, not arbitrary callers.

Synthetic tests independently enumerate bootstrap and both partition schedules,
including aligned boundaries and resumed short groups. They reject missing,
extra, duplicated or noncontiguous inventory/membership data rather than returning
an understated allowance. No real market or protected study observations are read.
