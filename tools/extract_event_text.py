from extract_assets import *
for name in ['strings.dat','events.dat']:
 rows={}
 for key,raw in archive((SOURCE/name).read_bytes()).items():
  try: raw=decompress(raw)
  except (ValueError,IndexError,struct.error): pass
  rows['-'.join(map(str,key))]=bytes(raw).rstrip(b'\0').decode('big5',errors='replace')
 (BASE/'research'/('texts-'+name+'.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2),'utf8')
 print(name,len(rows))
 for k,v in rows.items():
  if any(x in v for x in ['運氣','仙人','利率','倒霉','紅利','物價','五天']):print(k,v[:250])
