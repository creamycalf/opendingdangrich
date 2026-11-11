"""Apply the upstream rust-lld-wrapper argument filtering on Windows."""
import sys,subprocess
args=[a for a in sys.argv[2:] if a not in {'--export-table','--stack-first'}]
raise SystemExit(subprocess.call([sys.argv[1],*args,'--no-stack-first']))
