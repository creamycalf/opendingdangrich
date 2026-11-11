"""Read-only identity and PE comparison of the newly supplied PC distribution."""
from pathlib import Path
import json,hashlib,collections
import pefile
root=Path(__file__).resolve().parents[1]
old=root/'work/哆啦a梦大富翁/Dora'
new=Path('D:/Game/old/Doraemon/Doraemon')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def pe_info(path):
 p=pefile.PE(str(path));v={}
 for group in getattr(p,'FileInfo',[]):
  for item in group:
   for table in getattr(item,'StringTable',[]):
    v.update({k.decode(errors='replace'):val.decode(errors='replace') for k,val in table.entries.items()})
 return {'path':str(path),'bytes':path.stat().st_size,'sha256':sha(path),'machine':hex(p.FILE_HEADER.Machine),'timestamp':p.FILE_HEADER.TimeDateStamp,'imageBase':hex(p.OPTIONAL_HEADER.ImageBase),'entry':hex(p.OPTIONAL_HEADER.AddressOfEntryPoint),'version':v,'sections':[{'name':s.Name.rstrip(b'\0').decode(),'rva':hex(s.VirtualAddress),'size':s.SizeOfRawData,'sha256':hashlib.sha256(s.get_data()).hexdigest()} for s in p.sections],'imports':{d.dll.decode():[i.name.decode() if i.name else '#'+str(i.ordinal) for i in d.imports] for d in getattr(p,'DIRECTORY_ENTRY_IMPORT',[])}},p
files=[]
old_by_name={p.name.lower():p for p in old.iterdir() if p.is_file()}
for p in new.iterdir():
 if not p.is_file():continue
 q=old_by_name.get(p.name.lower());row={'name':p.name,'bytes':p.stat().st_size,'sha256':sha(p)}
 if q:row.update(oldBytes=q.stat().st_size,oldSha256=sha(q),same=row['sha256']==sha(q))
 files.append(row)
a,pa=pe_info(old/'wa.exe');b,pb=pe_info(new/'Doraemon.exe')
overlaps=[]
for sa in pa.sections:
 sb=next((s for s in pb.sections if s.Name==sa.Name),None)
 if sb is None:continue
 x,y=sa.get_data(),sb.get_data();diffs=[i for i in range(min(len(x),len(y))) if x[i]!=y[i]];runs=[]
 for i in diffs:
  if runs and runs[-1][1]==i:runs[-1][1]=i+1
  else:runs.append([i,i+1])
 overlaps.append({'name':sa.Name.rstrip(b'\0').decode(),'sameRva':sa.VirtualAddress==sb.VirtualAddress,'sharedBytes':min(len(x),len(y)),'differentBytes':len(diffs),'oldBytes':len(x),'newBytes':len(y),'runs':[{'oldVA':hex(pa.OPTIONAL_HEADER.ImageBase+sa.VirtualAddress+i),'bytes':j-i,'oldHex':x[i:min(j,i+32)].hex(),'newHex':y[i:min(j,i+32)].hex()} for i,j in runs[:100]],'runCount':len(runs)})
report={'oldExecutable':a,'newExecutable':b,'sectionsCompared':overlaps,'files':files,'dlls':[pe_info(p)[0] for p in new.glob('*.dll')]}
out=root/'research/new-pc-comparison.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'oldExe':a['sha256'],'newExe':b['sha256'],'versions':[a['version'],b['version']],'matchedData':[f['name'] for f in files if f.get('same') and Path(f['name']).suffix.lower() in ('.dat','.spr','.bg')],'changedData':[f for f in files if f.get('same') is False],'newFiles':[f['name'] for f in files if 'same' not in f],'sectionsCompared':overlaps},ensure_ascii=False,indent=2))
