"""Assemble the researched country records and validate live-catalog coverage.

This is a report-generation helper only. It never writes to the Store service.
"""
import collections
import copy
import datetime
import json
import math
import re
from pathlib import Path
from urllib.parse import urlparse

BASE = Path(__file__).parent
OUT = BASE.parent
old = json.loads((OUT / 'tea-shipping-audit-2026-09-29.json').read_text())
names = {r['code']: r['name'] for r in old['destinations']}
catalog = json.loads((BASE / 'catalog.json').read_text())
meta = json.loads((BASE / 'catalog-meta.json').read_text())
recheck = json.loads((BASE / 'catalog-recheck-2026-09-30.json').read_text())
assert not recheck['added'] and not recheck['removed'], 'Live destinations changed since the audit snapshot'
assert recheck['sameProduct'] and recheck['sameShipping'], 'Live product or shipping terms changed since the audit snapshot'
product = catalog['product']
codes = {code for rate in catalog['shipping'] for code in rate['countries']}
rows = []
for file in ['africa.json', 'americas.json', 'asia.json', 'asia-gulf.json', 'europe.json']:
    rows.extend(json.loads((BASE / file).read_text()))
assert len(rows) == 203, f'Expected 203 researched rows; found {len(rows)}'
assert len({r['code'] for r in rows}) == len(rows), 'Duplicate destination'
assert {r['code'] for r in rows} == codes, 'Catalog/research coverage mismatch'
assert not re.search(
    r'pending research|not yet researched|placeholder',
    json.dumps([{key: r.get(key) for key in ('rule', 'personalMailApplicability', 'permitFreeReason')} for r in rows]),
    re.I,
), 'Unfinished finding'

labels = {
    'allowed': 'Allowed under the stated conditions',
    'conditional': 'Conditional personal route',
    'permit_required': 'Permit / documented clearance route',
    'certificate_required': 'Phytosanitary certificate route',
    'not_verified': 'Unresolved — no verified import route',
    'domestic': 'Domestic shipment',
}
document_labels = {
    'supported': 'No-special-documents route supported, subject to conditions',
    'not_supported': 'Incompatible with the no-special-documents constraint',
    'unresolved': 'No-special-documents route unresolved',
    'unreviewed': 'No-special-documents review still in progress',
}
definitions = {
    'allowed': 'Official evidence supports this finished product and import channel without a plant permit or phytosanitary certificate. Packaging, declaration, food-quantity/value limits and inspection powers still apply where stated.',
    'conditional': 'A supported personal import route has specific quantity, packaging, inspection, notification or geographic conditions. Resolve the listed conditions before dispatch.',
    'permit_required': 'Published evidence establishes a permit, approval or documented clearance route. This is not permission already obtained. A possible processing exemption must be confirmed before omitting documents.',
    'certificate_required': 'Published evidence requires a phytosanitary certificate for the applicable route. Any claimed processing exemption needs the specific confirmation identified in the record.',
    'not_verified': 'The research identified a material gap in the finished-tea classification, postal applicability, current rule or required documents. Not a finding that tea is prohibited; do not treat this destination as cleared.',
    'domestic': 'Japan-origin shipment within Japan; no international agricultural import question.',
}
EU = set('AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK AX'.split())
SWE = 'https://jordbruksverket.se/languages/english/swedish-board-of-agriculture/plants/bringing-in-or-ordering-plants-and-plant-products-to-sweden-as-a-private-individual'
FIN = 'https://www.ruokavirasto.fi/en/themes/import-and-export/import/plants-and-plant-products/'
MAFF = 'https://www.maff.go.jp/pps/j/search/e_hayami_yubin.pdf?d=1702'
shared = {
    'EU-TEA': {
        'text': 'The common EU plant-health regime exempts finished dried tea from phytosanitary certification. Swedish guidance expressly covers private orders; Finnish guidance confirms processed tea is outside plant import controls. This applies to the 27 EU destinations and Åland below. Fresh leaves, live plants and herbal mixtures need separate assessment. Overseas territories are assessed separately.',
        'destinationCodes': sorted(EU),
        'evidenceUrls': [SWE, FIN],
    },
    'EU-PRIVATE-ORGANIC': {
        'text': 'Austrian Customs guidance VB-0240 section 2.4(b), explaining EU organic import rules, expressly excludes personal/private imports sent by post. A private recipient consuming the tea does not need a commercial organic certificate of inspection. Routine customs declarations remain necessary.',
        'destinationCodes': sorted(EU),
        'evidenceUrls': ['https://findok.bmf.gv.at/findok/iwg/80/80664/80664.3.pdf'],
    },
    'MAFF-POSTAL': {
        'text': 'Japan MAFF’s 21 April 2026 postal matrix has a specific manufactured-green-tea column. Q means phytosanitary certificate; P means destination import permit; ◎ means no phytosanitary certificate. Footnote 11 notes that some cases fall outside plant quarantine and then need neither document; it does not identify which cases qualify. Confirm applicability with the destination. This reference guidance does not waive other laws.',
        'evidenceUrls': [MAFF],
        'relevantCells': {'AE':'Q*11','BH':'PQ*11','KW':'PQ*11','OM':'PQ*11','QA':'PQ*11','SA':'PQ*11','BN':'PQ*11','LK':'PQ*11','PK':'PQ*11','TH':'Q','ID':'Q','IN':'Q','VN':'Q','PH':'◎','CL':'◎','MX':'◎'},
    },
}

# Standardize report prose without changing legal findings.
def clean(value):
    """Repair spacing in generated prose while preserving URLs and identifiers."""
    if isinstance(value, str):
        value = re.sub(r'(?<=[A-Za-z])(?=\d)', ' ', value)
        value = re.sub(r'(?<=\d)(?=[A-Za-z])', ' ', value)
        value = re.sub(r'\b(\d+)\s*(kg|g|days|years)\b', r'\1 \2', value)
        value = re.sub(r'(?<=[,;])(?=[A-Za-z])', ' ', value)
    return value

for r in rows:
    code = r['code']
    assert r['status'] in labels, (code, r['status'])
    assert r.get('rule') and r.get('personalMailApplicability') and r.get('researchAttempts'), code
    assert r.get('evidenceUrls') or code == 'JP', code
    assert all(urlparse(u).scheme in ('http', 'https') for u in r.get('evidenceUrls', [])), code
    r['name'] = names[code]
    for key in ['rule', 'personalMailApplicability', 'remainingQuestion', 'authority', 'permitFreeReason']:
        r[key] = clean(r.get(key)) or None
    r['researchAttempts'] = [clean(t) for t in r['researchAttempts']]
    r['evidenceUrls'] = list(dict.fromkeys(r['evidenceUrls']))
    r['sharedRuleIds'] = []
    if code in EU:
        r['sharedRuleIds'].append('EU-TEA')
        r['rule'] = 'EU-TEA'
        r['personalMailApplicability'] = 'EU-TEA'
        r['researchAttempts'] = ['EU-TEA']
        r['evidenceUrls'] = []
        r['sharedRuleIds'].append('EU-PRIVATE-ORGANIC')
        r['permitFreeReason'] = 'See the shared EU-TEA and EU-PRIVATE-ORGANIC rules.'
        r['permitFreeSources'] = shared['EU-TEA']['evidenceUrls'] + shared['EU-PRIVATE-ORGANIC']['evidenceUrls']
    if any(u.split('?')[0] == MAFF.split('?')[0] for u in r['evidenceUrls']):
        r['sharedRuleIds'].append('MAFF-POSTAL')
        r['maffPostalCell'] = shared['MAFF-POSTAL']['relevantCells'].get(code)
        assert r['maffPostalCell'], f'Missing MAFF postal cell for {code}'
        sentences = re.split(r'(?<=\.)\s+', r['rule'])
        r['rule'] = 'MAFF-POSTAL. ' + ' '.join(t for t in sentences if 'MAFF' not in t)
    if code == 'BN':
        r['quantityLimit']['max100gBags'] = 5
        r['quantityLimit']['unitCondition'] = 'Five pieces per item; each 100 g retail pouch is counted as one piece for this reconciliation.'
    q = r.get('quantityLimit')
    if isinstance(q, str):
        q = {'text': q}
    if q:
        r['quantityLimit'] = {k: clean(v) for k,v in q.items()}
    rates = [rate for rate in catalog['shipping'] if code in rate['countries']]
    gross = max(rate['maxGrams'] for rate in rates)
    bags = (gross - product['packagingGrams']) // product['packedGrams']
    r['liveMaxBags'] = bags
    r['liveMaxTeaNetGrams'] = bags * product['grams']
    r['liveMaxGrossGrams'] = gross
    r['liveServices'] = sorted({rate['label'].split(' · ')[0] for rate in rates})
    comparison = {'outcome':'no_numeric_threshold_verified', 'note':'No numeric agricultural/personal threshold was verified; the carrier maximum is not a personal-use allowance.'}
    if q and (q.get('netGrams') is not None or q.get('grossGrams') is not None):
        inclusive = q.get('inclusive', True)
        net = q.get('netGrams')
        gross_limit = q.get('grossGrams')
        thresholds = []
        if net is not None:
            thresholds.append(math.floor((net - (0 if inclusive else 1)) / product['grams']))
        if gross_limit is not None:
            thresholds.append(math.floor((gross_limit - product['packagingGrams'] - (0 if inclusive else 1)) / product['packedGrams']))
        if q.get('max100gBags') is not None:
            thresholds.append(q['max100gBags'])
        threshold_bags = min(thresholds)
        exceeds = bags > threshold_bags
        comparison = {
            'outcome':'exceeds_verified_route_threshold' if exceeds else 'within_numeric_threshold_only',
            'thresholdBagsUnderStatedWeightBasis':threshold_bags,
            'note': ('Current checkout exceeds the cited personal/exemption route. Reduce the cap; a larger route requiring permits or certificates is unavailable to this store.' if exceeds else 'Current maximum is within this numeric threshold; this does not settle permits, value limits, frequency, packaging or genuine personal use.'),
        }
        if q.get('weightBasisCaveat'):
            comparison['weightBasisUncertain'] = True
            comparison['conservativeBagsIfThresholdIncludesPackaging'] = max(0, (net - product['packagingGrams']) // product['packedGrams'])
            comparison['note'] += ' The legal weight basis needs confirmation; the stated bag equivalent assumes net product weight.'
    if code == 'JP':
        comparison = {'outcome':'domestic', 'note':'International import thresholds do not apply.'}
    r['quantityComparison'] = comparison
    r.setdefault('permitFreeDecision', 'unreviewed')
    assert r['permitFreeDecision'] in document_labels, code
    if r['permitFreeDecision'] != 'unreviewed':
        assert r.get('permitFreeReason'), code
        assert r.get('permitFreeSources') or code == 'JP', code
    if comparison['outcome'] == 'exceeds_verified_route_threshold':
        if r['permitFreeDecision'] == 'not_supported':
            comparison['note'] = 'Current checkout also exceeds the cited quantity threshold. Reducing quantity does not remove the separate regulatory requirement; this route is excluded under the store constraint.'
        elif r['permitFreeDecision'] in ('unresolved', 'unreviewed'):
            comparison['note'] = 'Current checkout exceeds the cited quantity threshold, and the no-special-documents route is unresolved. A smaller order alone does not establish clearance.'
    if r['status'] == 'not_verified':
        assert r.get('remainingQuestion'), code
        r['dispatchAssessment'] = 'Hold for the specific authority determination below.'
    elif r['status'] in ('permit_required', 'certificate_required'):
        r['dispatchAssessment'] = 'Do not dispatch under the documented route: the store will not obtain permits or certificates. Only an applicable automatic exemption could change this finding.'
    elif r['status'] == 'conditional':
        r['dispatchAssessment'] = 'Use only the stated personal route after verifying all its conditions.'
    elif r['status'] == 'domestic':
        r['dispatchAssessment'] = 'Domestic fulfillment.'
    else:
        r['dispatchAssessment'] = 'Agricultural route supported for the scoped product; comply with the stated packaging, declaration and personal-use conditions.'
    if r['permitFreeDecision'] == 'not_supported':
        r['dispatchAssessment'] = 'Do not dispatch under the store constraint. The published route requires the additional regulatory step explained below.'
    elif r['permitFreeDecision'] in ('unresolved', 'unreviewed'):
        r['dispatchAssessment'] = 'Not cleared for dispatch under the store no-permits/no-certificates constraint; review remains open.'
    if comparison['outcome'] == 'exceeds_verified_route_threshold':
        r['dispatchAssessment'] += ' The current maximum order is outside the reviewed threshold.'
    assert r['liveMaxTeaNetGrams'] == r['liveMaxBags'] * 100
    assert 80 + 120 * r['liveMaxBags'] <= r['liveMaxGrossGrams']
    assert 80 + 120 * (r['liveMaxBags'] + 1) > r['liveMaxGrossGrams']

rows.sort(key=lambda r:r['code'])
counts = dict(collections.Counter(r['status'] for r in rows))
document_counts = dict(collections.Counter(r['permitFreeDecision'] for r in rows))
mismatches = [r for r in rows if r['quantityComparison']['outcome'] == 'exceeds_verified_route_threshold']
result = {
    'reviewedAt':'2026-09-30',
    'completionStatus':'incomplete',
    'operatingConstraint':'The volunteer store will not obtain permits, phytosanitary/health/origin certificates, or special regulatory approvals. Routine postal/customs declarations and recipient arrival declarations are distinguished from obtaining certification. Mandatory separate agency registration or advance notice is stated explicitly rather than called a certificate.',
    'documentFreeDecisionLabels':document_labels,
    'documentFreeCounts':document_counts,
    'scope': 'Sealed 100 g retail pouches of plain Japanese steamed/dried Camellia sinensis sencha, sent from Japan by post to individuals for their own consumption. No live plants, fresh leaves, seeds, herbal mixtures, dairy, extracts, resale, traveller-baggage or gift-only assumptions.',
    'method': 'Destination agriculture/biosecurity legislation and NPPO/food-authority rules, supplemented by Japan MAFF’s commodity-specific postal guidance. Each enabled destination has its own finding, channel analysis and sources or a shared-rule reference. A generic plant-product law is not assumed to resolve manufactured tea unless its scope or commodity schedule does so. Older rules, conflicting sources and inaccessible current schedules are disclosed.',
    'catalog': {'url':'https://mof.sora.org/sora-pay/v1/catalog','version':catalog['version'],'enabled':catalog['enabled'],'capturedAt':meta['capturedAt'],'sha256':meta['sha256'],'destinationCount':len(codes),'rateBandCount':len(catalog['shipping']),'product':product,'weightCalculation':'Maximum 100 g pouches = floor((maximum listed gross grams - 80 g outer packaging) / 120 g packed pouch).'},
    'catalogRecheck': recheck,
    'statusDefinitions':definitions,
    'counts':counts,
    'liveChangesMade':False,
    'priorReview':'This report supersedes the earlier same-date review. Its verdicts address agricultural admissibility of personal postal tea, rather than equating carrier availability or commercial organic documentation with that answer.',
    'sharedRules':shared,
    'quantityMismatchCodes':[r['code'] for r in mismatches],
    'limitations':['This audit checks agricultural rules and identified personal-food import paperwork. It does not certify compliance with every labelling, food-safety, organic-claim, tax or carrier rule, or guarantee customs release.','Where a published rule requires an authority classification or a current schedule could not be obtained, the record is unresolved rather than assumed allowed or prohibited.','No published numeric cap does not mean unlimited personal quantities. All cited personal-use concessions require genuine personal consumption.','Value, frequency and package-count limits must be checked separately from net weight. Shipment splitting is not a way to evade aggregate allowances.'],
    'destinations':rows,
}
(OUT/'tea-shipping-audit-2026-09-29.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')

def weight(g):
    """Display a gram quantity as compact kilograms."""
    return f'{g/1000:g} kg'

def links(urls):
    """Keep source labels compact while retaining exact official URLs."""
    return ' · '.join(f'[{urlparse(u).netloc.removeprefix("www.")} {i}](<{u}>)' for i,u in enumerate(urls,1))

md = ['# Personal postal tea: agricultural import audit','',
      '**Updated 30 September 2026 — 203 enabled destinations; review is incomplete.**','',
      '[Australia](#au) allows this plain finished green tea. The full destination list cannot yet be described as cleared: some routes need permits or certificates, and other countries’ published rules leave a specific question unresolved. Each destination is assessed below.','',
      result['scope'],'',
      '**Store constraint:** '+result['operatingConstraint'],'',
      'The agricultural finding and the no-special-documents operating decision are separate. An agricultural exemption does not waive another mandatory food-import document. An unresolved finding is not a legal prohibition and is not counted as a completed clearance.','',
      '| No-special-documents review | Destinations |','|---|---:|']
for decision in document_labels:
    md.append(f'| {document_labels[decision]} | {document_counts.get(decision,0)} |')
md += ['',
      '| Finding | Destinations |','|---|---:|']
for status in definitions:
    md.append(f'| {labels[status]} | {counts.get(status,0)} |')
md += ['', 'The findings are based on agricultural import rules for the actual finished product and postal channel. Passenger allowances and live-plant rules are used only when the source also establishes their applicability here. The earlier same-date audit is superseded.', '',
       '## Current checkout: quantity mismatches','',
       'These orders exceed the verified personal-use or certificate-exemption route. Larger routes requiring permits or certificates are unavailable under the store constraint. No live shipping settings were changed.','',
       '| Destination | Current maximum | Reviewed threshold | Required action |','|---|---:|---|---|']
for r in mismatches:
    q=r['quantityLimit']; n=q.get('netGrams'); c=r['quantityComparison'];
    threshold = weight(n) if n is not None else weight(q['grossGrams'])+' gross'
    if q.get('weightBasisCaveat'):
        threshold += f'; weight basis unresolved ({c["conservativeBagsIfThresholdIncludesPackaging"]} pouches if packaging is counted)'
    action='Reduce cap to the supported no-special-documents route and enforce its other conditions.'
    if r['permitFreeDecision']=='not_supported':
        action='Exclude under the store constraint; reducing quantity alone does not remove the required regulatory step.'
    elif r['permitFreeDecision'] in ('unresolved', 'unreviewed'):
        action='Hold while the no-special-documents route is unresolved; a smaller order alone does not establish clearance.'
    md.append(f'| [{r["name"]} ({r["code"]})](#{r["code"].lower()}) | {r["liveMaxBags"]} pouches / {weight(r["liveMaxTeaNetGrams"])} tea | {threshold} | {action} |')
md += ['', 'The country entries also show thresholds that checkout already respects. The calculations check weight and explicit pouch-count limits; monetary and annual/frequency conditions are not validated by a weight cap. Singapore’s S$100 total-value condition, for example, still requires an order-value check.', '',
       '## How to use the decisions','']
for key,definition in definitions.items(): md.append(f'- **{labels[key]}:** {definition}')
md += ['', 'A missing numeric limit is not an unlimited personal allowance. Use truthful contents, origin, net/gross weights and sale value, and retain manufacturer packaging. The report does not establish compliance with every separate food-labelling, organic-claim, tax or carrier requirement.', '',
       '## Shared rules','']
for key,rule in shared.items():
    md += [f'### {key}', '', rule['text'], '', links(rule['evidenceUrls']), '']
    if 'relevantCells' in rule:
        md += ['Selected postal matrix cells: '+', '.join(f'{c} {v}' for c,v in rule['relevantCells'].items())+'.','']
md += ['## Destination index','', '| Code | Destination | Agricultural finding | No-special-documents decision | Current maximum tea |','|---|---|---|---|---:|']
for r in rows:
    md.append(f'| {r["code"]} | [{r["name"]}](#{r["code"].lower()}) | {labels[r["status"]]} | {document_labels[r["permitFreeDecision"]]} | {r["liveMaxBags"]} × 100 g ({weight(r["liveMaxTeaNetGrams"])}) |')
md += ['', '## Country findings', '']
for r in rows:
    md += [f'<a id="{r["code"].lower()}"></a>', f'### {r["name"]} ({r["code"]})', '', f'**{labels[r["status"]]}.**', '']
    md += ['**Store decision:** '+document_labels[r['permitFreeDecision']]+'.', '']
    if r.get('permitFreeReason'):
        md += [r['permitFreeReason'], '']
    if r.get('permitFreeSources'):
        md += ['**Document-rule sources:** '+links(r['permitFreeSources']), '']
    if r['code'] in EU:
        md += ['See [EU-TEA](#eu-tea) and [EU-PRIVATE-ORGANIC](#eu-private-organic).', '']
    else:
        display_rule = r['rule']
        if display_rule.startswith('MAFF-POSTAL.'):
            cell = r.get('maffPostalCell') or 'see table'
            display_rule = f'[MAFF-POSTAL](#maff-postal): **{cell}**. ' + display_rule.removeprefix('MAFF-POSTAL.').strip()
        md += [display_rule, '', '**Personal post:** '+r['personalMailApplicability'], '']
        if r.get('independentFoodConformityRule'):
            md += ['**Separate food or conformity rule:** '+clean(r['independentFoodConformityRule']), '']
        if r.get('foodConformityAccessNotes'):
            md += ['**Evidence access:** '+clean(r['foodConformityAccessNotes']), '']
    if r.get('quantityLimit'):
        q=r['quantityLimit']; parts=[]
        if q.get('max100gBags') is not None: parts.append(f'Tea-item cap: {q["max100gBags"]} × 100 g pouches ({weight(q["max100gBags"] * 100)} tea)')
        if q.get('netGrams') is not None: parts.append(('Up to ' if q.get('inclusive',True) else 'Less than ')+weight(q['netGrams'])+' product weight')
        if q.get('grossGrams') is not None: parts.append('Up to '+weight(q['grossGrams'])+' gross')
        for key in ['scope','basis','text','unitCondition','weightBasisCaveat']:
            if q.get(key): parts.append(str(q[key]))
        if q.get('maxValue') is not None: parts.append(f'Value threshold: {q["maxValue"]} {q.get("currency","")}')
        md += ['**Quantity conditions:** '+'. '.join(part.rstrip('.') for part in parts)+'.','']
    md += [f'**Checkout:** {r["liveMaxBags"]} pouches / {weight(r["liveMaxTeaNetGrams"])} tea; highest carrier band {weight(r["liveMaxGrossGrams"])} gross. '+r['quantityComparison']['note'], '', '**Dispatch:** '+r['dispatchAssessment'], '']
    if r.get('remainingQuestion'): md += ['**To resolve:** '+r['remainingQuestion'], '']
    if r['evidenceUrls']: md += ['**Sources:** '+links(r['evidenceUrls']), '']
    if r['status']=='not_verified': md += ['**Research trail:** '+' '.join(r['researchAttempts']), '']
md += ['## Catalog and verification evidence','',
       f'The [public catalog](https://mof.sora.org/sora-pay/v1/catalog) was captured at {meta["capturedAt"]}: version `{catalog["version"]}`, enabled `{str(catalog["enabled"]).lower()}`, {len(catalog["shipping"])} rate bands and {len(codes)} unique destinations. Snapshot SHA-256: `{meta["sha256"]}`.','',
       f'A live recheck at {recheck["checkedAt"]} confirmed the same 203 destinations, product and shipping terms. [Recheck evidence](tea-audit-work/catalog-recheck-2026-09-30.json).','',
       'Maximum pouches are calculated from the catalog’s 100 g tea weight, 120 g packed-pouch weight and 80 g outer packaging allowance. Carrier weight capacity is never treated as an agricultural permission.','',
       'Validation: exact 203-code match against the catalog snapshot; no duplicate or missing destination records; source links/shared-rule references on every international destination; all status counts reconciled; weight arithmetic and threshold comparisons checked. This coverage check does not mean every legal question is resolved; the unresolved destinations still require the evidence identified in their findings.','',
       '[Structured report](tea-shipping-audit-2026-09-29.json) · [Catalog snapshot](tea-audit-work/catalog.json) · [Snapshot metadata](tea-audit-work/catalog-meta.json)','']
(OUT/'tea-shipping-audit-2026-09-29.md').write_text('\n'.join(md))

# Keep the volunteer-store decision list readable without losing the full evidence.
brief = ['# Tea shipping without special documents', '',
         '**Review date: 30 September 2026. Research is incomplete.**', '',
         result['scope'], '',
         result['operatingConstraint'], '',
         f'All {len(rows)} enabled destination codes have a record. '
         f'{document_counts.get("supported", 0)} have a supported route under the stated conditions; '
         f'{document_counts.get("not_supported", 0)} are incompatible with the store constraint; '
         f'{document_counts.get("unresolved", 0)} remain unverified and should be held. '
         'These counts include territories and domestic Japan. No live shipping settings were changed.', '',
         '[Full country findings and primary sources](tea-shipping-audit-2026-09-29.md) · '
         '[Structured evidence](tea-shipping-audit-2026-09-29.json)', '',
         '**Australia:** Plain manufactured green tea is allowed in unopened, clean new packaging, '
         'free of insects and contamination. Declare the contents accurately. '
         '[Australian agriculture guidance](https://www.agriculture.gov.au/travelling/bringing-mailing-goods).', '',
         '## Quantity and value conditions', '',
         'A carrier weight band is not a personal-use allowance. All supported routes require genuine '
         'private consumption and compliance with the specific packaging, weight, value and frequency conditions '
         'in the country finding. In particular, the current checkout exceeds the reviewed limits for '
         'Micronesia (2 kg), Solomon Islands (1 kg), and Mauritania (10 kg, with weight basis still to confirm). '
         'Maldives permits up to 5 kg net of personal processed food; the current 50-pouch checkout cap is within that weight threshold, subject to genuine personal use and the country conditions. '
         'Singapore also has a S$100 total-food-value limit; Aruba’s licence exemption is limited to Afl. 400 CIF per qualifying personal consignment, including freight and insurance. '
         'El Salvador’s personal online-purchase exemption is limited to US$300 in aggregate purchase value, excluding delivery charges. '
         'Brunei’s five-piece tea-item limit does not remove its separate paperwork requirement. '
         'Reducing quantity does not resolve an independent permit or certificate requirement.', '']
for decision, heading in [('supported', 'Supported under the country conditions'),
                          ('not_supported', 'Exclude under the no-special-documents constraint'),
                          ('unresolved', 'Hold — a no-special-documents route is not established')]:
    group = sorted((r for r in rows if r['permitFreeDecision'] == decision), key=lambda r:r['name'])
    brief += [f'## {heading} ({len(group)})', '',
              ', '.join(f'[{r["name"]} ({r["code"]})](tea-shipping-audit-2026-09-29.md#{r["code"].lower()})' for r in group)+'.', '']
brief += ['The hold group is not a list of legal prohibitions. Its country findings identify the missing '
          'classification, postal exemption, current schedule or authority determination. Broad-law '
          'interpretations used for operational exclusions are labelled as inferences in the evidence.', '']
(OUT/'tea-shipping-no-documents-2026-09-30.md').write_text('\n'.join(brief))
print(json.dumps({'rows':len(rows),'counts':counts,'documentFreeCounts':document_counts,'quantityMismatches':[r['code'] for r in mismatches],'markdownBytes':(OUT/'tea-shipping-audit-2026-09-29.md').stat().st_size},indent=2))
