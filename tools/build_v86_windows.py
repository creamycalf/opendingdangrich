"""Windows translation of the pinned v86 Makefile CPU target, with upstream patch."""
from pathlib import Path
import os,subprocess
root=Path(__file__).resolve().parents[1];tc=root/'.toolchain'
src=tc/'v86-source/v86-847e34d5499b17b90d2783d5342ddd243c753497'
env=dict(os.environ,RUSTUP_HOME=str(tc/'rustup'),CARGO_HOME=str(tc/'cargo'))
env['PATH']=str(tc/'cargo/bin')+os.pathsep+env['PATH']
clang=next((tc/'llvm').glob('*/bin/clang.exe'))
node='E:/companysoft/nodejs/node.exe'
def run(args):subprocess.run([str(a) for a in args],cwd=src,env=env,check=True)
(src/'build').mkdir(exist_ok=True)
for kind in ['jit','interpreter','analyzer']:
 for suffix in ['', '0f']:run([node,f'gen/generate_{kind}.js','--output-dir','build/','--table',kind+suffix])
flags=['-c','-Wall','--target=wasm32','-O3','-flto','-nostdlib','-fvisibility=hidden','-ffunction-sections','-fdata-sections']
run([clang,*flags,'-DSOFTFLOAT_FAST_INT64','-DINLINE_LEVEL=5','-DSOFTFLOAT_FAST_DIV32TO16','-DSOFTFLOAT_FAST_DIV64TO32','-o','build/softfloat.o','lib/softfloat/softfloat.c'])
run([clang,*flags,'-DZSTDLIB_VISIBILITY=','-o','build/zstddeclib.o','lib/zstd/zstddeclib.c'])
lld=next((tc/'rustup/toolchains').glob('*/lib/rustlib/x86_64-pc-windows-msvc/bin/rust-lld.exe'))
wrapper=src/'tools/windows-link.cmd';py=Path(__file__).resolve().with_name('v86_link.py')
wrapper.write_text(f'@echo off\n"{os.sys.executable}" "{py}" "{lld}" %*\n')
run([tc/'cargo/bin/cargo.exe','rustc','--release','--target','wasm32-unknown-unknown','--','-C','linker='+str(wrapper),'-C','link-args=--import-table --global-base=4096 --strip-debug','-C','link-args=build/softfloat.o','-C','link-args=build/zstddeclib.o','-C','target-feature=+bulk-memory,+multivalue,+simd128'])
