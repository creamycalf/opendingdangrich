import subprocess,json,urllib.request,pathlib
repo='https://api.github.com/repos/creamycalf/opendingdangrich'
r=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,check=True)
c=dict(line.split('=',1) for line in r.stdout.splitlines() if '=' in line)
def request(url,data=None,kind='application/json'):
 req=urllib.request.Request(url,data=data,headers={'Authorization':'Bearer '+c['password'],'Accept':'application/vnd.github+json','Content-Type':kind,'User-Agent':'Dingdang-release'})
 with urllib.request.urlopen(req,timeout=600) as res:return json.load(res)
release=request(repo+'/releases/tags/v1.0.0-rc26')
apk=pathlib.Path('releases/1.0.0-rc26/DingdangTouch-1.0.0-rc26.apk')
url=release['upload_url'].split('{')[0]+'?name='+apk.name
config='header = "Authorization: Bearer '+c['password']+'"\n'
result=subprocess.run(['curl.exe','--http1.1','--proxy','http://127.0.0.1:7897','--connect-timeout','30','--max-time','600','--fail','--config','-','-H','Content-Type: application/vnd.android.package-archive','--data-binary','@'+str(apk),url],input=config,text=True,capture_output=True)
if result.returncode:raise RuntimeError('Upload failed: '+str(result.returncode))
asset=json.loads(result.stdout);assert asset['size']==apk.stat().st_size
print(asset['browser_download_url'])
print(release['html_url'])
