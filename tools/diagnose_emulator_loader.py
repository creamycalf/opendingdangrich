"""Bounded native-loader trace for the locally installed Android emulator.
Read-only diagnostics; does not change Windows loader/security settings.
"""
import ctypes as C
from ctypes import wintypes as W
from pathlib import Path
import os,struct,time,json

ROOT=Path(__file__).resolve().parents[1]
EMU=Path('F:/aiworkspace/codexworkspace/aichatbox/.toolchain/android-sdk/emulator')
os.environ['PATH']=';'.join(str(p) for p in [EMU,EMU/'lib64',EMU/'lib64/qt/lib'])+';'+os.environ['PATH']
k=C.WinDLL('kernel32',use_last_error=True)
class SI(C.Structure):
    _fields_=[('cb',W.DWORD),('reserved',W.LPWSTR),('desktop',W.LPWSTR),('title',W.LPWSTR),('x',W.DWORD),('y',W.DWORD),('cx',W.DWORD),('cy',W.DWORD),('xc',W.DWORD),('yc',W.DWORD),('fill',W.DWORD),('flags',W.DWORD),('show',W.WORD),('cb2',W.WORD),('reserved2',C.c_void_p),('stdin',W.HANDLE),('stdout',W.HANDLE),('stderr',W.HANDLE)]
class PI(C.Structure):
    _fields_=[('process',W.HANDLE),('thread',W.HANDLE),('pid',W.DWORD),('tid',W.DWORD)]
def api(name,args,result=W.BOOL):
    f=getattr(k,name);f.argtypes=args;f.restype=result;return f
create=api('CreateProcessW',[W.LPCWSTR,W.LPWSTR,C.c_void_p,C.c_void_p,W.BOOL,W.DWORD,C.c_void_p,W.LPCWSTR,C.POINTER(SI),C.POINTER(PI)])
read=api('ReadProcessMemory',[W.HANDLE,C.c_void_p,C.c_void_p,C.c_size_t,C.POINTER(C.c_size_t)])
wait=api('WaitForDebugEvent',[C.c_void_p,W.DWORD])
cont=api('ContinueDebugEvent',[W.DWORD,W.DWORD,W.DWORD])
close=api('CloseHandle',[W.HANDLE])
terminate=api('TerminateProcess',[W.HANDLE,W.UINT])
path_for=api('GetFinalPathNameByHandleW',[W.HANDLE,W.LPWSTR,W.DWORD,W.DWORD],W.DWORD)
si=SI();si.cb=C.sizeof(si);pi=PI()
exe=EMU/'qemu/windows-x86_64/qemu-system-x86_64-headless.exe'
command=C.create_unicode_buffer(f'"{exe}" -version')
assert create(str(exe),command,None,None,False,0x08000002,None,str(EMU),C.byref(si),C.byref(pi)),C.WinError(C.get_last_error())
events=[];exited=False
def memory(address,count):
    b=C.create_string_buffer(count);n=C.c_size_t();read(pi.process,address,b,count,C.byref(n));return b.raw[:n.value]
try:
    deadline=time.monotonic()+20
    while time.monotonic()<deadline:
        event=C.create_string_buffer(256)
        if not wait(event,500):continue
        raw=event.raw;kind,pid,tid=struct.unpack_from('<III',raw);status=0x10002
        if kind in [3,6]:
            handle=struct.unpack_from('<Q',raw,16)[0]
            if handle:
                buf=C.create_unicode_buffer(4096);path_for(handle,buf,len(buf),0);events.append({'kind':'module','path':buf.value});close(handle)
        elif kind==8:
            ptr,unicode,length=struct.unpack_from('<QHH',raw,16)
            events.append({'kind':'debugText','text':memory(ptr,length*(2 if unicode else 1)).decode('utf-16le' if unicode else 'utf8',errors='replace')})
        elif kind==1:
            code=struct.unpack_from('<I',raw,16)[0];n=struct.unpack_from('<I',raw,40)[0]
            params=list(struct.unpack_from('<'+'Q'*min(n,15),raw,48))
            events.append({'kind':'exception','code':hex(code),'params':[hex(p) for p in params]})
            if code!=0x80000003:status=0x80010001
        elif kind==5:
            events.append({'kind':'exit','code':hex(struct.unpack_from('<I',raw,16)[0])});exited=True
        cont(pid,tid,status)
        if exited:break
finally:
    if not exited:terminate(pi.process,0)
    close(pi.thread);close(pi.process)
(ROOT/'research/emulator-loader-trace.json').write_text(json.dumps(events,indent=2),encoding='utf8')
print(json.dumps(events,indent=2))
