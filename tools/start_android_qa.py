"""Launch only the workspace QA AVD, hidden, using the verified host renderer."""
from pathlib import Path
import os, subprocess, ctypes, json
ROOT=Path(__file__).resolve().parents[1]
SDK=Path(os.environ.get('ANDROID_HOME', 'F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk'))
avd=ROOT/'.toolchain/avd';assert (avd/'DingdangTest.avd').is_dir()
adb=SDK/'platform-tools/adb.exe'
existing=subprocess.run([str(adb),'-s','emulator-5580','emu','avd','name'],capture_output=True,text=True,encoding='utf8',errors='replace',timeout=10,creationflags=0x08000000)
if existing.returncode==0 and existing.stdout.strip():
    assert existing.stdout.splitlines()[0].strip()=='DingdangTest'
    print('Workspace QA emulator is already running')
else:
    ctypes.windll.kernel32.SetErrorMode(3)
    env=dict(os.environ,ANDROID_AVD_HOME=str(avd),ANDROID_HOME=str(SDK))
    args=[str(SDK/'emulator/emulator.exe'),'-avd','DingdangTest','-no-window','-no-audio','-no-snapshot','-no-boot-anim','-gpu','host','-feature','-Vulkan','-memory','2048','-port','5580','-camera-back','none','-camera-front','none']
    out=ROOT/'test-results';out.mkdir(exist_ok=True)
    with (out/'emulator-host-stdout.log').open('wb') as stdout,(out/'emulator-host-stderr.log').open('wb') as stderr:
        proc=subprocess.Popen(args,env=env,stdin=subprocess.DEVNULL,stdout=stdout,stderr=stderr,creationflags=0x08000000)
    (out/'emulator-pid.txt').write_text(str(proc.pid))
    print(json.dumps(dict(pid=proc.pid,avd='DingdangTest',port=5580)))
