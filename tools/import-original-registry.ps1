$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$backup=Join-Path $root 'research/registry-before-import'
New-Item -ItemType Directory -Force -Path $backup | Out-Null
$keys=@('HKLM\SOFTWARE\Wow6432Node\Gameone\Doraemon','HKLM\SOFTWARE\Gameone\Doraemon')
$state=@()
for($i=0;$i -lt $keys.Count;$i++){
  $key=$keys[$i]
  $exists=Test-Path ('Registry::'+$key.Replace('HKLM','HKEY_LOCAL_MACHINE'))
  $state+=@{key=$key;existed=$exists}
  if($exists){
    & reg.exe export $key (Join-Path $backup "key-$i.reg") /y
    if($LASTEXITCODE -ne 0){throw 'Registry backup failed'}
  }
}
$state | ConvertTo-Json | Set-Content (Join-Path $backup 'state.json')
& reg.exe import (Join-Path $root 'work/哆啦a梦大富翁/Reg/Reg7.reg') /reg:64
if($LASTEXITCODE -ne 0){throw 'Registry import failed'}
$data=Get-ItemPropertyValue -LiteralPath 'Registry::HKEY_LOCAL_MACHINE/SOFTWARE/Wow6432Node/Gameone/Doraemon' -Name Data
if($data.Length -ne 228){throw 'Unexpected game configuration size'}
Write-Output "Game registry imported and verified: $($data.Length) bytes. Prior state: $backup"
