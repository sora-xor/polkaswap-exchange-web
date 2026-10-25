import json,pathlib
base=pathlib.Path(__file__).parent
old=json.loads((base.parent/'tea-shipping-audit-2026-09-29.json').read_text())
names={d['code']:d['name'] for d in old['destinations']}
path=base/'asia.json'
data=json.loads(path.read_text()) if path.exists() else []
def add(code,status,rule,mail,authority,urls,limit=None,question=None,attempts=None):
 global data
 row=dict(code=code,name=names[code],status=status,rule=rule,personalMailApplicability=mail,quantityLimit=limit,authority=authority,evidenceUrls=urls,remainingQuestion=question,researchAttempts=attempts or ['Read the cited official rule and checked its product and import-channel scope.'],reviewedAt='2026-09-29')
 data=[d for d in data if d['code']!=code]+[row];path.write_text(json.dumps(sorted(data,key=lambda x:x['code']),ensure_ascii=False,indent=2)+'\n')
