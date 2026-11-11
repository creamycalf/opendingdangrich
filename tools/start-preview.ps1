$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $projectRoot 'app')
try { & npm.cmd run dev -- --port 5178 } finally { Pop-Location }
