param(
    [string]$SdkPath='F:\aiworkspace\codexworkspace\aichatbox\.toolchain\android-sdk',
    [string]$GradleCache='F:\aiworkspace\codexworkspace\aichatbox\.toolchain\gradle',
    [switch]$Offline,
    [switch]$InternalOnly
)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$version=(Get-Content -LiteralPath (Join-Path $projectRoot 'app/package.json') -Raw | ConvertFrom-Json).version
$apkName="DingdangTouch-$version-debug.apk"
$jdk=Get-ChildItem -LiteralPath (Join-Path $projectRoot '.toolchain') -Directory | Where-Object Name -Like 'jdk-21*' | Select-Object -First 1
if (!$jdk) { throw 'Missing workspace .toolchain/jdk-21 directory' }
$env:JAVA_HOME=$jdk.FullName
$env:ANDROID_HOME=$SdkPath
$env:ANDROID_SDK_ROOT=$SdkPath
$env:GRADLE_USER_HOME=$GradleCache
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
$android=Join-Path $projectRoot 'app/android'
[IO.File]::WriteAllText((Join-Path $android 'local.properties'),'sdk.dir='+$SdkPath.Replace('\','/').Replace(':','\:'))
Push-Location (Join-Path $projectRoot 'app')
try {
    & npm.cmd run build
    if($LASTEXITCODE -ne 0){throw 'Web build failed'}
    & node node_modules/@capacitor/cli/bin/capacitor sync android
    if($LASTEXITCODE -ne 0){throw 'Capacitor sync failed'}
    Set-Location $android
    $buildArgs=@('--no-daemon','--console=plain','assembleDebug')
    if($Offline){$buildArgs+='--offline'}
    & .\gradlew.bat @buildArgs
    if($LASTEXITCODE -ne 0){throw 'Android build failed'}
    if($InternalOnly){
        Get-FileHash -LiteralPath (Join-Path $android 'app/build/outputs/apk/debug/app-debug.apk') -Algorithm SHA256
        return
    }
    $output=Join-Path $projectRoot 'releases'
    New-Item -ItemType Directory -Force $output | Out-Null
    Copy-Item -LiteralPath (Join-Path $android 'app/build/outputs/apk/debug/app-debug.apk') -Destination (Join-Path $output $apkName)
    Get-FileHash -LiteralPath (Join-Path $output $apkName) -Algorithm SHA256
} finally { Pop-Location }
