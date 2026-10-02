"""Synthetic replay/transition tests; no market data, model-file access or network."""
import copy
from hashlib import sha256
import json
import os
from pathlib import Path
import py_compile
import subprocess
import sys
import tempfile
from types import ModuleType
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from scripts.bots import accumulation_journal_replay as worker

START = 1785261600000 + 3_600_000
UNIT = 10**18
DIGEST = 'a' * 64
EVIDENCE = [{"purpose": "synthetic", "artifactId": "invented", "sha256": DIGEST}]


def ratio(n, d=1):
    return {"numerator": str(n), "denominator": str(d)}


def mark(number=1, observed=None, received=None, price=None):
    return {"blockHash": '0x' + f'{number:064x}', "blockNumber": number,
            "observedAtMs": START - 6000 if observed is None else observed,
            "receivedAtMs": START - 1000 if received is None else received,
            "price": ratio(2) if price is None else price}


def request():
    return {"kind": "accumulation-journal-replay-request-v1", "operation": "replay",
            "episodeId": "invented-episode", "registrationSha256": DIGEST,
            "journalJsonl": '', "expectedRecordCount": 0, "expectedHeadSha256": None, "packet": None}


def packet(m=None, decision=START + 1300):
    m = mark(2, START, START + 1000) if m is None else m
    return {"status": "verified", "packetSha256": 'b' * 64,
        "genesisHash": '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5',
        "denominator": '100000000000000000000000000000000000000',
        "block": {"hash": m['blockHash'], "height": m['blockNumber'], "timestampMs": m['observedAtMs']},
        "contextReceivedAtMs": m['receivedAtMs'], "decisionAtMs": decision, "currentPrice": m['price'],
        "latestCompletedClose": {"timestampMs": decision // 3_600_000 * 3_600_000,
             "availableAtMs": START + 1000, "price": ratio(2), "evidenceSha256": 'c' * 64},
        "candidates": [{"inputKusd": size, "status": "unavailable", "reason": "native-null-route",
            "evidenceSha256": [str(size) * 64], "quote": None} for size in range(1, 10)]}


class Journal:
    def __init__(self):
        self.request = request()
        self.result = None

    def append(self, kind, value):
        operation = {**self.request, 'operation': 'transition', 'packet': None,
                     'nextEvent': {'kind': kind, 'input': value, 'evidence': copy.deepcopy(EVIDENCE)}}
        result = worker.evaluate_request(worker.canonical(operation))
        line = result['proposal']['recordJsonl']
        self.request['journalJsonl'] += line
        self.request['expectedRecordCount'] = result['proposal']['recordCount']
        self.request['expectedHeadSha256'] = result['proposal']['headSha256']
        self.result = result
        return result

    def open(self):
        return self.append('opening', {'openingAtMs': START, 'capitalKusdCodec': str(10 * UNIT),
            'feeReserveXorCodec': str(UNIT), 'price': ratio(2), 'mark': mark()})

    def decision(self):
        return self.append('valuation', {'atMs': START + 1300, 'mark': mark(2, START, START + 1000)})

    def frozen(self, **changes):
        value = {'orderId': 'synthetic-order', 'inputKusd': 1,
            'quotedOutputXorCodec': str(7 * UNIT // 10), 'minimumOutputXorCodec': str(6965 * UNIT // 10000),
            'feeCeilingXorCodec': str(UNIT // 10), 'decisionAtMs': START + 1400,
            'quoteReceivedAtMs': START + 1200, 'expiresAtMs': START + 6000,
            'executionTargetMs': START + 3000, 'maximumExecutionLagMs': 2000,
            'decisionMark': mark(2, START, START + 1000), 'admissionSha256': DIGEST,
            'quoteSha256': DIGEST, 'feeSha256': DIGEST, 'callHex': '0x0102', 'envelopeHex': '0x0304'}
        value.update(changes)
        return self.append('order-frozen', {'order': value})

    def committed(self):
        self.open(); self.decision(); self.frozen()
        return self.append('attempt-committed', {'atMs': START + 1500})

    def settle(self, **changes):
        value = {'mark': mark(3, START + 4000, START + 5000), 'orderId': 'synthetic-order',
            'envelopeSha256': sha256(bytes.fromhex('0304')).hexdigest(),
            'includedAtMs': START + 4000, 'receivedAtMs': START + 5000,
            'outcome': 'hypothetical-success', 'outputXorCodec': str(6965 * UNIT // 10000),
            'paidFeeXorCodec': str(UNIT // 10)}
        value.update(changes)
        return self.append('settlement', value)

    def evaluate(self, p=None):
        return worker.evaluate_request(worker.canonical({**self.request, 'packet': p}))


def rewritten(data, change):
    """Rehash a tampered synthetic journal to test semantics beyond hash consistency."""
    data = copy.deepcopy(data)
    rows = [json.loads(line) for line in data['journalJsonl'].splitlines()]
    change(rows)
    previous = None
    output = ''
    for index, row in enumerate(rows, 1):
        row['sequence'] = index; row['previousRecordSha256'] = previous
        line = worker.canonical(row)
        output += line.decode()
        previous = sha256(line).hexdigest()
    data.update(journalJsonl=output, expectedHeadSha256=previous, expectedRecordCount=len(rows))
    return data


class JournalTests(unittest.TestCase):
    def test_exclusive_opening_proposal_replay_and_exact_projection(self):
        j = Journal(); j.open(); j.decision()
        result = j.evaluate(packet())
        self.assertEqual(result['status'], 'eligible')
        self.assertEqual(result['episode']['opening']['capitalKusdCodec'], str(10 * UNIT))
        self.assertEqual(result['episode']['current']['peakXor'], ratio(6))
        self.assertEqual(result['episode']['journalRevision'], 2)
        self.assertEqual(result['journal']['recordCount'], 2)
        self.assertEqual(result['episode']['journalPrefixSha256'], sha256(j.request['journalJsonl'].encode()).hexdigest())
        self.assertEqual(result['journal']['prefixSha256'], result['episode']['journalPrefixSha256'])
        self.assertEqual(result['inputSha256'], sha256(worker.canonical({**j.request, 'packet': packet()})).hexdigest())
        self.assertEqual(result['baseJournal']['headSha256'], j.request['expectedHeadSha256'])
        self.assertIsNone(result['proposal'])
        self.assertFalse(result['policyCalled'])
        self.assertFalse(result['scheduleCompletenessVerified'])
        self.assertIn('trusted-parent', result['evidenceAuthentication'])

    def test_empty_prefix_only_opening_transition(self):
        with self.assertRaises(ValueError): worker.evaluate_request(worker.canonical(request()))
        j = Journal()
        with self.assertRaisesRegex(ValueError, 'opening-order'):
            j.append('valuation', {'atMs': START, 'mark': mark()})
        j.open()
        with self.assertRaisesRegex(ValueError, 'opening-order'): j.open()

    def test_result_hash_tampering_rejected_even_after_chain_recomputed(self):
        j = Journal(); j.open(); j.decision()
        changed = rewritten(j.request, lambda rows: rows[-1]['result'].update(stateSha256='0' * 64))
        with self.assertRaisesRegex(ValueError, 'record-result-mismatch'):
            worker.evaluate_request(worker.canonical(changed))

    def test_forged_state_field_not_accepted(self):
        j = Journal(); j.open()
        changed = rewritten(j.request, lambda rows: rows[0]['input'].update(state={'kusd': 1000}))
        with self.assertRaisesRegex(ValueError, 'object-fields'):
            worker.evaluate_request(worker.canonical(changed))

    def test_omission_reordering_and_head_mismatch(self):
        j = Journal(); j.open(); j.decision()
        data = copy.deepcopy(j.request); data['journalJsonl'] = data['journalJsonl'].splitlines(True)[0]
        with self.assertRaisesRegex(ValueError, 'prefix-record-count'): worker.evaluate_request(worker.canonical(data))
        data = copy.deepcopy(j.request); data['expectedHeadSha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'prefix-head-mismatch'): worker.evaluate_request(worker.canonical(data))
        data = copy.deepcopy(j.request); data['journalJsonl'] = ''.join(reversed(data['journalJsonl'].splitlines(True)))
        with self.assertRaisesRegex(ValueError, 'journal-chain-binding'): worker.evaluate_request(worker.canonical(data))

    def test_noncanonical_missing_newline_blank_and_duplicate_key(self):
        j = Journal(); j.open()
        for line in (j.request['journalJsonl'].rstrip(), '\n' + j.request['journalJsonl'],
                     j.request['journalJsonl'].replace('"kind":', '"kind" :', 1)):
            data = {**j.request, 'journalJsonl': line}
            with self.assertRaises(ValueError): worker.evaluate_request(worker.canonical(data))
        with self.assertRaisesRegex(ValueError, 'duplicate-key'):
            worker.evaluate_request(b'{"operation":"replay","operation":"transition"}')

    def test_boolean_revision_and_wrong_episode_reject(self):
        j = Journal(); j.open()
        for change in (lambda rows: rows[0].update(expectedReducerRevision=False),
                       lambda rows: rows[0].update(episodeId='other')):
            with self.assertRaises(ValueError): worker.evaluate_request(worker.canonical(rewritten(j.request, change)))

    def test_all_five_current_mark_fields_must_join(self):
        j = Journal(); j.open(); j.decision()
        changes = [lambda p: p['block'].update(hash='0x'+'f'*64), lambda p:p['block'].update(height=3),
                   lambda p:p['block'].update(timestampMs=START+1), lambda p:p.update(currentPrice=ratio(3)),
                   lambda p:p.update(contextReceivedAtMs=START+1001)]
        for change in changes:
            p = packet(); change(p)
            with self.assertRaisesRegex(ValueError, 'packet-full-mark-mismatch'): j.evaluate(p)

    def test_fee_failure_and_one_attempt_latch(self):
        j = Journal(); j.committed()
        result = j.settle(outcome='hypothetical-paid-failure', outputXorCodec='0', paidFeeXorCodec=str(UNIT//5))
        self.assertEqual(result['state']['kusd'], ratio(10))
        self.assertEqual(result['state']['xor'], ratio(4, 5))
        self.assertEqual(result['state']['remainingFeeReserveXor'], ratio(4, 5))
        self.assertTrue(result['state']['attemptCommitted'])
        self.assertEqual(result['state']['paidFailures'], 1)
        self.assertEqual(j.evaluate()['status'], 'ineligible')
        result = j.append('attempt-committed', {'atMs': START+5100})
        self.assertEqual(json.loads(result['proposal']['recordJsonl'])['result']['status'], 'rejected')
        self.assertEqual(j.evaluate()['status'], 'incomplete')

    def test_success_settlement_and_duplicate_retains_error(self):
        j = Journal(); j.committed(); result=j.settle()
        self.assertEqual(result['state']['kusd'], ratio(9))
        self.assertEqual(result['state']['xor'], ratio(3193,2000))
        result=j.settle()
        self.assertEqual(result['status'],'incomplete')
        self.assertEqual(result['state']['kusd'],ratio(9))

    def test_stop_after_commit_never_erases_attempt_or_later_settlement(self):
        j=Journal(); j.committed()
        j.append('valuation',{'atMs':START+2100,'mark':mark(3,START+2000,START+2100,ratio(5,2))})
        result=j.settle(mark=mark(4,START+4000,START+5000),outputXorCodec=str(3*UNIT))
        self.assertEqual(result['state']['stopReason'],'loss')
        self.assertEqual(result['state']['stoppedAtMs'],START+2100)
        self.assertTrue(result['state']['successfulPurchase'])

    def test_exact_drawdown_latches_and_idle_repricing_never_targets(self):
        j=Journal();j.open()
        result=j.append('valuation',{'atMs':START+1100,'mark':mark(2,START+1000,START+1100,ratio(25,11))})
        self.assertEqual(result['state']['stopReason'],'loss')
        j=Journal();j.open()
        result=j.append('valuation',{'atMs':START+1100,'mark':mark(2,START+1000,START+1100,ratio(1))})
        self.assertIsNone(result['state']['stopReason'])

    def test_target_requires_success_growth_and_excess(self):
        j=Journal();j.committed();result=j.settle(outputXorCodec=str(UNIT))
        self.assertEqual(result['state']['stopReason'],'target')
        self.assertTrue(result['state']['successfulPurchase'])

    def test_replayerror_changed_state_is_retained_without_revision_advance(self):
        j=Journal();j.open();j.decision();j.frozen(feeCeilingXorCodec=str(7*UNIT//10))
        before=j.result['state']['revision']
        result=j.append('attempt-committed',{'atMs':START+1600})
        row=json.loads(result['proposal']['recordJsonl'])
        self.assertEqual(row['result']['status'],'rejected')
        self.assertEqual(result['state']['revision'],before)
        self.assertEqual(result['state']['lastAtMs'],START+1600)
        self.assertEqual(j.evaluate()['state']['lastAtMs'],START+1600)

    def test_original_minimum_unfunded_fee_and_late_state_stay_unresolved(self):
        for changes in ({'outputXorCodec':'1'}, {'paidFeeXorCodec':str(2*UNIT)}):
            j=Journal();j.committed();result=j.settle(**changes)
            self.assertEqual(result['status'],'incomplete')
            self.assertEqual(result['state']['orderPhase'],'committed')
            self.assertEqual(result['state']['feesPaidXor'],ratio(0))
        j=Journal();j.committed()
        j.append('valuation',{'atMs':START+4500,'mark':mark(4,START+4200,START+4500)})
        result=j.settle()
        self.assertEqual(result['status'],'incomplete')
        self.assertEqual(result['state']['orderPhase'],'committed')

    def test_cancel_before_commit_allows_new_order_but_duplicate_id_rejects(self):
        j=Journal();j.open();j.decision();j.frozen()
        result=j.append('order-cancelled',{'atMs':START+1450,'reason':'expired-quote'})
        self.assertFalse(result['state']['attemptCommitted'])
        result=j.frozen(decisionAtMs=START+1500)
        self.assertEqual(result['status'],'incomplete')

    def test_terminal_keeps_original_deadline_and_requires_no_pending_attempt(self):
        end=START+24*3_600_000
        j=Journal();j.open()
        result=j.append('terminal',{'mark':mark(3,end-1,end+1000)})
        self.assertTrue(result['state']['finalized'])
        self.assertEqual(result['state']['deadlineMs'],end)
        self.assertEqual(result['state']['stoppedAtMs'],end)
        j=Journal();j.committed()
        result=j.append('terminal',{'mark':mark(3,end-1,end+1000)})
        self.assertEqual(result['status'],'incomplete')
        self.assertFalse(result['state']['finalized'])

    def test_nonmutating_slot_and_invocation_lifecycle(self):
        j=Journal();j.open();j.decision();rev=j.result['state']['revision']
        j.append('decision-slot',{'slot':0,'atMs':START+1400,'status':'ready','packetSha256':DIGEST,'reason':None})
        j.append('admission-start',{'invocationId':'run1','atMs':START+1500,'inputSha256':DIGEST,'packetSha256':DIGEST})
        self.assertEqual(j.evaluate()['status'],'incomplete')
        result=j.append('admission-result',{'invocationId':'run1','atMs':START+1600,'inputSha256':DIGEST,
             'outputSha256':DIGEST,'status':'evaluated','action':'wait','selectedInputKusd':None,'reason':'no-candidate'})
        self.assertEqual(result['state']['revision'],rev)
        self.assertEqual(result['state']['kusd'],ratio(10))
        with self.assertRaisesRegex(ValueError,'invocation-result-binding'):
            j.append('admission-failure',{'invocationId':'run1','atMs':START+1700,'inputSha256':DIGEST,'reason':'timeout'})

    def test_invocation_failure_and_failed_slot_are_not_free_waits(self):
        j=Journal();j.open()
        j.append('admission-start',{'invocationId':'run1','atMs':START+1000,'inputSha256':DIGEST,'packetSha256':DIGEST})
        result=j.append('admission-failure',{'invocationId':'run1','atMs':START+2000,'inputSha256':DIGEST,'reason':'timeout'})
        self.assertEqual(result['status'],'incomplete')
        j=Journal();j.open()
        result=j.append('decision-slot',{'slot':0,'atMs':START+1000,'status':'failed','packetSha256':DIGEST,'reason':'source-failed'})
        self.assertEqual(result['status'],'incomplete')

    def test_structural_and_capacity_limits(self):
        with self.assertRaises(ValueError): worker.evaluate_request(b' '*(worker.MAX_INPUT_BYTES+1))
        for value in (1.5,float('nan')):
            data=request();data['expectedRecordCount']=value
            with self.assertRaises(ValueError): worker.evaluate_request(json.dumps(data).encode())
        j=Journal();j.open()
        data={**j.request,'expectedRecordCount':513}
        with self.assertRaisesRegex(ValueError,'record-count'):worker.evaluate_request(worker.canonical(data))
        data={**j.request,'unexpected':{}}
        with self.assertRaisesRegex(ValueError,'object-fields'):worker.evaluate_request(worker.canonical(data))

    def test_reused_artifact_id_with_changed_purpose_or_hash_rejects(self):
        for field,value in (('purpose','different'),('sha256','f'*64)):
            refs=copy.deepcopy(EVIDENCE);other=copy.deepcopy(refs[0]);other[field]=value;refs.append(other)
            with self.assertRaisesRegex(ValueError,'duplicate-evidence-reference'):
                worker.evidence_refs(refs)

    def test_model_file_and_policy_are_never_used(self):
        j=Journal();j.open();j.decision()
        model,policy,reducer,runner=worker.load_modules()
        with patch.object(policy,'admit_accumulation',side_effect=AssertionError('forbidden')), \
             patch.object(runner,'load_math',side_effect=AssertionError('class replacement forbidden')):
            self.assertEqual(j.evaluate(packet())['status'],'eligible')

    def test_nonmutating_events_cannot_backdate_new_packet(self):
        j=Journal(); j.open(); j.decision()
        j.append('decision-slot',{'slot':0,'atMs':START+2000,'status':'ready','packetSha256':DIGEST,'reason':None})
        with self.assertRaisesRegex(ValueError,'packet-before-journal-event'):
            j.evaluate(packet())

    def test_owned_modules_cannot_be_replaced_after_loading(self):
        modules=worker.load_modules();original=modules[0]
        with patch.dict(sys.modules,{original.__name__:ModuleType(original.__name__)}):
            with self.assertRaisesRegex(ValueError,'owned-module-replaced'):worker.load_modules()

    def test_first_loader_replaces_unchecked_cached_modules(self):
        program = "\n".join([
            'import runpy, sys, types',
            f'scope = runpy.run_path({str(Path(worker.__file__))!r})',
            "poison = types.ModuleType('scripts.bots.accumulation_stopping_model')",
            'poison.sentinel = True',
            "sys.modules[poison.__name__] = poison",
            "loaded = scope['load_modules']()",
            'assert loaded[0] is not poison and not hasattr(loaded[0], "sentinel")',
            'assert loaded[2].OpeningPortfolio is loaded[1].OpeningPortfolio',
        ])
        result=subprocess.run([sys.executable,'-I','-S','-B','-c',program],capture_output=True,timeout=10)
        self.assertEqual(result.returncode,0,result.stderr)

    def test_source_loader_bypasses_timestamp_valid_pyc_and_rejects_initializer(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory)/'scripts/bots';base.mkdir(parents=True)
            script=base/Path(worker.__file__).name;script.write_bytes(Path(worker.__file__).read_bytes())
            for name in worker.DEPENDENCIES:
                (base/name).write_bytes((ROOT/'scripts/bots'/name).read_bytes())
            source=base/'accumulation_stopping_model.py';original=source.read_bytes()
            poison=b'raise RuntimeError("poison pyc executed")\n#'
            source.write_bytes(poison+b' '*(len(original)-len(poison)))
            stamp=source.stat().st_mtime_ns
            py_compile.compile(str(source),doraise=True)
            source.write_bytes(original);os.utime(source,ns=(stamp,stamp))
            program="import runpy; scope=runpy.run_path("+repr(str(script))+"); scope['load_modules']()"
            command=[sys.executable,'-I','-S','-B','-c',program]
            result=subprocess.run(command,capture_output=True,timeout=10)
            self.assertEqual(result.returncode,0,result.stderr)
            (base.parent/'__init__.pyc').write_bytes(b'not-executable-fixture')
            result=subprocess.run(command,capture_output=True,timeout=10)
            self.assertNotEqual(result.returncode,0)
            self.assertIn(b'unexpected-package-initializer',result.stderr)

    def test_pinned_source_mutation_rejected_before_import(self):
        with patch.object(worker,'source_bytes',side_effect=worker.JournalError('sealed-source-changed')):
            with self.assertRaisesRegex(ValueError,'sealed-source-changed'):
                worker.load_modules()

    def test_isolated_cli_proposal_and_no_extra_arguments(self):
        data={**request(),'operation':'transition','nextEvent':{'kind':'opening','evidence':EVIDENCE,
             'input':{'openingAtMs':START,'capitalKusdCodec':str(10*UNIT),'feeReserveXorCodec':str(UNIT),
                      'price':ratio(2),'mark':mark()}}}
        cmd=[sys.executable,'-I','-S','-B',str(Path(worker.__file__))]
        result=subprocess.run(cmd,input=worker.canonical(data),capture_output=True,timeout=10)
        self.assertEqual(result.returncode,0,result.stderr)
        output=json.loads(result.stdout);self.assertEqual(output['proposal']['recordCount'],1)
        result=subprocess.run(cmd+['--model','forbidden'],input=b'',capture_output=True,timeout=10)
        self.assertEqual(result.returncode,1)
        self.assertEqual(json.loads(result.stdout)['reason'],'arguments-not-supported')


if __name__ == '__main__':
    unittest.main()
