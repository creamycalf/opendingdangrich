import subprocess,json,urllib.request,pathlib
repo='https://api.github.com/repos/creamycalf/opendingdangrich'
r=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,capture_output=True,check=True)
c=dict(line.split('=',1) for line in r.stdout.splitlines() if '=' in line)
def request(url,data=None,kind='application/json'):
 req=urllib.request.Request(url,data=data,headers={'Authorization':'Bearer '+c['password'],'Accept':'application/vnd.github+json','Content-Type':kind,'User-Agent':'Dingdang-release'})
 with urllib.request.urlopen(req,timeout=600) as res:return json.load(res)
release=request(repo+'/releases',json.dumps({'tag_name':'v1.0.0-rc26','target_commitish':'main','name':'叮当大富翁 RC26','body':'全屏开局设置、障碍竞速按住加速。详见 README 截图及操作说明。可覆盖安装保留存档。'}).encode())
apk=pathlib.Path('releases/1.0.0-rc26/DingdangTouch-1.0.0-rc26.apk')
request(release['upload_url'].split('{')[0]+'?name='+apk.name,apk.read_bytes(),'application/vnd.android.package-archive')
print(release['html_url'])
