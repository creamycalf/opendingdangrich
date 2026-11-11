param([string]$Installation = 'D:/Game/old/Doraemon/Doraemon')
$ErrorActionPreference = 'Stop'
$output = Join-Path $PSScriptRoot '../work/vm-cd-audio'
[void](New-Item -ItemType Directory -Force -Path $output)
foreach ($track in (Get-ChildItem -LiteralPath (Join-Path $Installation 'music') -Filter 'track*.ogg' -File)) {
    $target = Join-Path $output ($track.BaseName.ToLowerInvariant() + '.s16le')
    & ffmpeg -nostdin -hide_banner -loglevel error -y -i $track.FullName -f s16le -ar 22050 -ac 2 ($target + '.tmp')
    if ($LASTEXITCODE -ne 0) { throw "Cannot decode $($track.Name)" }
    Move-Item -LiteralPath ($target + '.tmp') -Destination $target -Force
}
