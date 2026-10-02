import concurrent.futures,pathlib,requests,subprocess
p=pathlib.Path('docs/reports/tea-audit-work/europe-review-sources');p.mkdir(exist_ok=True)
u={
'bf':'https://nutrition.bf/sites/default/files/2025-03/recueil-de-textes-v5-nouveau-1-2.pdf',
'cd':'https://www.agriculture.gouv.cd/uploads/legislation/690b22e02405c_1762337504.pdf',
'lr':'https://www.wto.org/english/tratop_e/tpr_e/s441_e.pdf',
'sc':'https://www.tradeportal.sc/wp-content/uploads/2023/12/Animal-and-Plant-Biosecurity-Act-2014.pdf',
'st':'https://faolex.fao.org/docs/pdf/sao160888.pdf',
'yt':'https://daaf.mayotte.agriculture.gouv.fr/IMG/pdf/ap-2025-daaf-0230_importation_vegetaux_signe.pdf',
}
def get(kv):
 k,v=kv
 try:
  r=requests.get(v,timeout=45);r.raise_for_status();(p/f'{k}.pdf').write_bytes(r.content);subprocess.run(['pdftotext','-layout',str(p/f'{k}.pdf'),str(p/f'{k}.txt')],capture_output=True);return k,r.status_code,len(r.content)
 except Exception as e:return k,str(e)
for item in concurrent.futures.ThreadPoolExecutor(6).map(get,u.items()): print(item)
