import requests,re,html,pathlib
u='https://app.sfe.go.cr/SFECuarentena/aspx/RequisitosImportacion/ConsultarRequisitosImportacion.aspx'
s=requests.Session();t=s.get(u,timeout=30).text
p=pathlib.Path(__file__).with_name('sources')
for pres in ['254','67','-1']:
 data={html.unescape(k):html.unescape(v) for k,v in re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"',t)}
 for name,body in re.findall(r'<select[^>]+name="([^"]+)"[^>]*>(.*?)</select>',t,re.S):
  v=re.search(r'<option(?: selected="selected")? value="([^"]*)"',body);data[name]=v[1] if v else '-1'
 data.update({'ctl00$ContentPlaceHolder1$ddl_Pais':'121','ctl00$ContentPlaceHolder1$ddl_Presentacion':pres,'ctl00$ContentPlaceHolder1$btnAceptar':'Consultar'})
 r=s.post(u,data=data,timeout=30);t=r.text;(p/('cr-japan-'+pres+'.html')).write_text(t)
 clean=html.unescape(re.sub('<[^>]+>',' ',t));print(pres,' '.join(clean.split())[-15000:])
