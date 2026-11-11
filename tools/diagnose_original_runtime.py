"""Bounded debugger: capture game error arguments before its MessageBox call.

Runs only the workspace compatibility copy; never clicks windows or changes
system settings. Terminates its own diagnostic child on capture or timeout.
"""
import ctypes as C
from ctypes import wintypes as W
from pathlib import Path
import hashlib, json, struct, time

ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'work/compat-v053'
assert hashlib.sha256((folder/'Doraemon.exe').read_bytes()).hexdigest()=='526ec7fe6ec2b52f136b4368bca681b06120f0ffdee7cc8fdb561d95f239c480', 'Unknown executable; refusing address-specific debugging'
k=C.WinDLL('kernel32',use_last_error=True)
class SI(C.Structure):
    _fields_=[('cb',W.DWORD),('reserved',W.LPWSTR),('desktop',W.LPWSTR),('title',W.LPWSTR),
              ('x',W.DWORD),('y',W.DWORD),('cx',W.DWORD),('cy',W.DWORD),('xc',W.DWORD),('yc',W.DWORD),('fill',W.DWORD),('flags',W.DWORD),('show',W.WORD),('cb2',W.WORD),('reserved2',C.c_void_p),('stdin',W.HANDLE),('stdout',W.HANDLE),('stderr',W.HANDLE)]
class PI(C.Structure):
    _fields_=[('process',W.HANDLE),('thread',W.HANDLE),('pid',W.DWORD),('tid',W.DWORD)]
def declare(name,args,result=W.BOOL):
    f=getattr(k,name); f.argtypes=args; f.restype=result; return f
create=declare('CreateProcessW',[W.LPCWSTR,W.LPWSTR,C.c_void_p,C.c_void_p,W.BOOL,W.DWORD,C.c_void_p,W.LPCWSTR,C.POINTER(SI),C.POINTER(PI)])
read=declare('ReadProcessMemory',[W.HANDLE,C.c_void_p,C.c_void_p,C.c_size_t,C.POINTER(C.c_size_t)])
write=declare('WriteProcessMemory',[W.HANDLE,C.c_void_p,C.c_void_p,C.c_size_t,C.POINTER(C.c_size_t)])
wait=declare('WaitForDebugEvent',[C.c_void_p,W.DWORD])
cont=declare('ContinueDebugEvent',[W.DWORD,W.DWORD,W.DWORD])
context=declare('Wow64GetThreadContext',[W.HANDLE,C.c_void_p])
setcontext=declare('Wow64SetThreadContext',[W.HANDLE,C.c_void_p])
openthread=declare('OpenThread',[W.DWORD,W.BOOL,W.DWORD],W.HANDLE)
close=declare('CloseHandle',[W.HANDLE])
terminate=declare('TerminateProcess',[W.HANDLE,W.UINT])
flush=declare('FlushInstructionCache',[W.HANDLE,C.c_void_p,C.c_size_t])
si=SI();si.cb=C.sizeof(si);pi=PI()
assert create(str(folder/'Doraemon.exe'),None,None,None,False,2,None,str(folder),C.byref(si),C.byref(pi)), C.WinError(C.get_last_error())
def memory(address,size):
    b=C.create_string_buffer(size);n=C.c_size_t()
    read(pi.process,address,b,size,C.byref(n))
    return b.raw[:n.value]
def string(address):
    b=memory(address,512).split(b'\0')[0]
    return {'hex':b.hex(),'text':b.decode('cp950',errors='replace')}
refs=json.loads((ROOT/'research/startup-audit.json').read_text(encoding='utf8'))['references']
sites={int(r['at'],16) for r in refs if 'MessageBoxA' in r['api']}
milestones={0x4aba47:'CRT entry',0x455468:'WinMain',0x4556f4:'window initialization completed',0x455727:'registry check passed',0x4557d0:'resource manager constructor',0x43721a:'disc check bypass reached',0x47db4d:'navigation builder reached'}
original_bytes={}
milestones.update({0x455805:'resource initialization call',0x45580a:'resource initialization returned',0x4372f5:'resource initialization audio step',0x437319:'resource initialization final step',0x4558f1:'graphics initialization call',0x4558f6:'graphics initialization returned',0x455b51:'font initialization call',0x455b56:'font initialization returned',0x456a30:'initial scene setup',0x456a63:'message loop entered'})
events=[];armed=False;exited=False
try:
    deadline=time.monotonic()+25
    while time.monotonic()<deadline:
        event=C.create_string_buffer(256)
        if not wait(event,500):continue
        raw=event.raw;kind,pid,tid=struct.unpack_from('<III',raw)
        status=0x10002
        if kind==1:
            code=struct.unpack_from('<I',raw,16)[0]
            address=struct.unpack_from('<Q',raw,32)[0]
            first=struct.unpack_from('<I',raw,168)[0]
            if code in (0x80000003,0x4000001f):
                if not armed:
                    for site in sites|milestones.keys():
                        original_bytes[site]=memory(site,1)
                        assert write(pi.process,site,b'\xcc',1,None), C.WinError(C.get_last_error())
                    flush(pi.process,None,0);armed=True
                elif address in sites or address in milestones:
                    thread=openthread(0x18,False,tid);ctx=C.create_string_buffer(716)
                    struct.pack_into('<I',ctx,0,0x10007)
                    assert context(thread,ctx), C.WinError(C.get_last_error())
                    if address in milestones:
                        events.append({'kind':'milestone','address':hex(address),'stage':milestones[address],'eax':hex(struct.unpack_from('<I',ctx.raw,176)[0])})
                        assert write(pi.process,address,original_bytes[address],1,None)
                        flush(pi.process,address,1)
                        struct.pack_into('<I',ctx,184,address)
                        assert setcontext(thread,ctx)
                        close(thread)
                        cont(pid,tid,status)
                        continue
                    close(thread)
                    esp=struct.unpack_from('<I',ctx.raw,196)[0]
                    args=struct.unpack('<4I',memory(esp,16))
                    events.append({'kind':'message','site':hex(address),'text':string(args[1]),'caption':string(args[2])})
                    break
            else:
                events.append({'kind':'exception','code':hex(code),'address':hex(address),'firstChance':first})
                status=0x80010001
                if not first:break
        elif kind==5:
            events.append({'kind':'exit','code':struct.unpack_from('<I',raw,16)[0]});exited=True
        elif kind in (3,6):
            handle=struct.unpack_from('<Q',raw,16)[0]
            if handle:close(handle)
        cont(pid,tid,status)
        if exited:break
    if not exited and time.monotonic()>=deadline:events.append({'kind':'timeout','seconds':25,'note':'No game MessageBox breakpoint or process exit observed; this does not verify gameplay.'})
finally:
    if not exited:terminate(pi.process,0)
    close(pi.thread);close(pi.process)
report={'cwd':str(folder),'events':events}
(ROOT/'research/runtime-diagnostic.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=True,indent=2))
